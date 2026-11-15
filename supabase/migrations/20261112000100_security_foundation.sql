-- Task 005A: local, unapplied Supabase migration. No credentials belong here.
-- Run only through a separately approved migration workflow as postgres.
-- The explicit transaction makes role/bootstrap failures atomic. Do not replay
-- as a repair script: pre-existing roles/schema require separate inspection.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL search_path = pg_catalog, pg_temp;

DO $bootstrap$
BEGIN
    IF current_user <> 'postgres' OR current_database() <> 'postgres' THEN
        RAISE EXCEPTION 'Requires the controlled Supabase postgres migration principal';
    END IF;
    IF EXISTS (
        SELECT 1 FROM pg_catalog.pg_roles
        WHERE rolname IN ('fitsocial_owner', 'fitsocial_guard', 'fitsocial_runtime')
    ) OR EXISTS (
        SELECT 1 FROM pg_catalog.pg_namespace WHERE nspname = 'app_private'
    ) THEN
        RAISE EXCEPTION 'Existing application roles or schema require separate review';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_publication WHERE puballtables) THEN
        RAISE EXCEPTION 'All-table publication requires private-data exposure review';
    END IF;
    -- Tables/functions below are created as postgres, so its defaults apply.
    -- app_private is absent above, ruling out defaults scoped to that schema.
    -- Allow the creator, PUBLIC (OID 0), and the named grantees revoked below.
    -- NOINHERIT does not suppress PUBLIC grants; each table/function REVOKE ALL
    -- removes them before COMMIT, including the PostgreSQL 17 table MAINTAIN right.
    IF EXISTS (
        SELECT 1 FROM pg_catalog.pg_default_acl AS defaults
        JOIN pg_catalog.pg_roles AS creator ON creator.oid = defaults.defaclrole
        CROSS JOIN LATERAL pg_catalog.aclexplode(defaults.defaclacl) AS acl
        WHERE creator.rolname = current_user AND defaults.defaclnamespace = 0
            AND defaults.defaclobjtype IN ('r', 'f')
            AND acl.grantee <> defaults.defaclrole AND acl.grantee <> 0
            AND acl.grantee NOT IN (
                SELECT oid FROM pg_catalog.pg_roles
                WHERE rolname IN ('anon', 'authenticated', 'service_role', 'authenticator')
            )
    ) THEN
        RAISE EXCEPTION 'Unexpected postgres table/function default grantees require separate review';
    END IF;
END;
$bootstrap$;

CREATE ROLE fitsocial_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB
    NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE fitsocial_guard NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB
    NOCREATEROLE NOREPLICATION NOBYPASSRLS;
-- No password is set. Credential provisioning is a separate operational task.
CREATE ROLE fitsocial_runtime LOGIN NOINHERIT NOSUPERUSER NOCREATEDB
    NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD NULL;

-- Trusted migration principal only; never grant these memberships to runtime.
-- Explicit PG17 options support ownership transfers and subsequent owner DDL.
GRANT fitsocial_owner, fitsocial_guard TO postgres WITH INHERIT TRUE, SET TRUE;

CREATE SCHEMA app_private AUTHORIZATION fitsocial_owner;
REVOKE ALL ON SCHEMA app_private
    FROM PUBLIC, anon, authenticated, service_role, authenticator;
GRANT USAGE ON SCHEMA app_private TO fitsocial_runtime, fitsocial_guard;
GRANT CONNECT ON DATABASE postgres TO fitsocial_runtime;

-- These defaults affect future objects created as owner/guard, not as postgres.
-- The bootstrap check and explicit object revokes handle postgres-created objects.
-- Do not change shared postgres defaults or Supabase-managed platform privileges.
ALTER DEFAULT PRIVILEGES FOR ROLE fitsocial_owner
    REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE fitsocial_guard
    REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Create the FK as postgres, which has access to the supported Auth primary key.
-- Do not grant Auth-schema privileges or Auth-role membership to app roles.
CREATE TABLE app_private.app_accounts (
    id uuid PRIMARY KEY REFERENCES auth.users (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    status text NOT NULL
        CONSTRAINT app_accounts_status_check
        CHECK (status IN ('active', 'deactivated', 'suspended', 'deleted')),
    created_at timestamptz NOT NULL DEFAULT pg_catalog.transaction_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT pg_catalog.transaction_timestamp(),
    CONSTRAINT app_accounts_timestamp_order CHECK (updated_at >= created_at)
);

CREATE TABLE app_private.revoked_sessions (
    session_id uuid PRIMARY KEY,
    account_id uuid NOT NULL REFERENCES app_private.app_accounts (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    revoked_at timestamptz NOT NULL DEFAULT pg_catalog.transaction_timestamp(),
    token_expires_at timestamptz NOT NULL,
    CONSTRAINT revoked_sessions_expiry_order CHECK (token_expires_at >= revoked_at)
);
CREATE INDEX revoked_sessions_account_id_idx
    ON app_private.revoked_sessions (account_id);

REVOKE ALL ON TABLE app_private.app_accounts, app_private.revoked_sessions
    FROM PUBLIC, anon, authenticated, service_role, authenticator;
ALTER TABLE app_private.app_accounts OWNER TO fitsocial_owner;
ALTER TABLE app_private.revoked_sessions OWNER TO fitsocial_owner;
ALTER TABLE app_private.app_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.app_accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE app_private.revoked_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.revoked_sessions FORCE ROW LEVEL SECURITY;

CREATE FUNCTION app_private.actor_subject()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $actor$
DECLARE
    raw_context text;
    claims jsonb;
    actor uuid;
BEGIN
    raw_context := pg_catalog.current_setting('request.jwt.claims', true);
    IF raw_context IS NULL OR pg_catalog.octet_length(raw_context) > 256 THEN
        RETURN NULL;
    END IF;
    BEGIN
        claims := raw_context::jsonb;
        IF pg_catalog.jsonb_typeof(claims) IS DISTINCT FROM 'object' THEN
            RETURN NULL;
        END IF;
        IF pg_catalog.jsonb_typeof(claims -> 'sub') IS DISTINCT FROM 'string' THEN
            RETURN NULL;
        END IF;
        IF (claims - 'sub') <> '{}'::jsonb THEN
            RETURN NULL;
        END IF;
        actor := (claims ->> 'sub')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
        RETURN NULL;
    END;
    IF actor = '00000000-0000-0000-0000-000000000000'::uuid THEN
        RETURN NULL;
    END IF;
    RETURN actor;
END;
$actor$;

REVOKE ALL ON FUNCTION app_private.actor_subject()
    FROM PUBLIC, anon, authenticated, service_role, authenticator;
ALTER FUNCTION app_private.actor_subject() OWNER TO fitsocial_owner;
GRANT EXECUTE ON FUNCTION app_private.actor_subject()
    TO fitsocial_runtime, fitsocial_guard;

-- The guard's all-row SELECT policies are solely for the narrow point lookup.
-- Runtime has neither membership in guard nor direct access to the denylist.
GRANT SELECT ON TABLE app_private.app_accounts TO fitsocial_runtime, fitsocial_guard;
GRANT SELECT ON TABLE app_private.revoked_sessions TO fitsocial_guard;
CREATE POLICY app_accounts_runtime_select ON app_private.app_accounts
    FOR SELECT TO fitsocial_runtime
    USING (id = app_private.actor_subject());
CREATE POLICY app_accounts_guard_select ON app_private.app_accounts
    FOR SELECT TO fitsocial_guard USING (true);
CREATE POLICY revoked_sessions_guard_select ON app_private.revoked_sessions
    FOR SELECT TO fitsocial_guard USING (true);

CREATE FUNCTION app_private.session_is_denied(p_session_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
CALLED ON NULL INPUT
SET search_path = pg_catalog, pg_temp
SET row_security = on
AS $denial$
DECLARE
    actor uuid;
BEGIN
    actor := app_private.actor_subject();
    IF actor IS NULL OR p_session_id IS NULL
        OR p_session_id = '00000000-0000-0000-0000-000000000000'::uuid THEN
        RETURN true;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM app_private.app_accounts AS account
        WHERE account.id = actor AND account.status = 'active'
    ) THEN
        RETURN true;
    END IF;
    -- Any matching row denies, including an unexpected account mismatch.
    -- No expiry filter: refreshed tokens may outlive the first observed expiry.
    RETURN EXISTS (
        SELECT 1 FROM app_private.revoked_sessions AS revoked
        WHERE revoked.session_id = p_session_id
    );
    -- Deliberately no exception-to-false handler. DB failures abort the call.
END;
$denial$;

REVOKE ALL ON FUNCTION app_private.session_is_denied(uuid)
    FROM PUBLIC, anon, authenticated, service_role, authenticator;
-- PostgreSQL requires CREATE on the containing schema for ownership transfer.
-- Grant it only during this transaction, then remove it before commit.
GRANT CREATE ON SCHEMA app_private TO fitsocial_guard;
ALTER FUNCTION app_private.session_is_denied(uuid) OWNER TO fitsocial_guard;
REVOKE CREATE ON SCHEMA app_private FROM fitsocial_guard;
GRANT EXECUTE ON FUNCTION app_private.session_is_denied(uuid) TO fitsocial_runtime;

-- No runtime/guard writes, provisioning role, logout, cleanup or outbox here.
-- FORCE subjects ordinary owner queries to RLS; owners can still alter/disable it.
-- Superusers and BYPASSRLS credentials still bypass policies.
COMMIT;
