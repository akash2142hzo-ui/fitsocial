-- Run ONLY through an actual fitsocial_runtime login in the disposable runner.
-- pg_temp objects are connection-local test helpers, never production helpers.
SELECT pg_backend_pid() AS initial_backend_pid \gset
CREATE TEMP TABLE verification_temp (id integer);
CREATE FUNCTION pg_temp.require(ok boolean, label text) RETURNS void
LANGUAGE plpgsql AS $assert$
BEGIN
    IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION '%', label; END IF;
END;
$assert$;
SELECT pg_temp.require(
    current_setting('fitsocial.disposable', true) = 'task045c'
    AND current_user = 'fitsocial_runtime' AND session_user = 'fitsocial_runtime',
    'Actual disposable runtime login required');

BEGIN ISOLATION LEVEL READ COMMITTED;
SELECT pg_temp.require(app_private.actor_subject() IS NULL
    AND NOT EXISTS (SELECT 1 FROM app_private.app_accounts)
    AND app_private.session_is_denied('10000000-0000-4000-8000-000000000001'),
    'Initially absent identity must deny');
DO $malformed$
DECLARE context text;
BEGIN
    FOREACH context IN ARRAY ARRAY[
        '', '{broken', 'null', '[]', '{}', '1', '"text"',
        '{"sub":null}', '{"sub":1}', '{"sub":"not-a-uuid"}',
        '{"sub":"00000000-0000-0000-0000-000000000000"}',
        '{"sub":"00000000-0000-4000-8000-000000000001","role":"admin"}',
        repeat(' ', 257)] LOOP
        PERFORM set_config('request.jwt.claims', context, true);
        PERFORM pg_temp.require(app_private.actor_subject() IS NULL
            AND NOT EXISTS (SELECT 1 FROM app_private.app_accounts)
            AND app_private.session_is_denied('10000000-0000-4000-8000-000000000001'),
            'Malformed identity must deny');
    END LOOP;
END;
$malformed$;
DO $identity$
DECLARE actor text;
BEGIN
    FOREACH actor IN ARRAY ARRAY[
        '00000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000002'] LOOP
        PERFORM set_config('request.jwt.claims', json_build_object('sub', actor)::text, true);
        PERFORM pg_temp.require((SELECT count(*) = 1 AND bool_and(id = actor::uuid)
            FROM app_private.app_accounts), 'A/B self-only account visibility');
        PERFORM pg_temp.require(NOT EXISTS (SELECT 1 FROM app_private.app_accounts
            WHERE id <> actor::uuid), 'A/B direct-ID isolation');
        PERFORM pg_temp.require(app_private.session_is_denied(
            '10000000-0000-4000-8000-000000000001') IS FALSE,
            'Active unrevoked account must be allowed by denial helper');
        PERFORM pg_temp.require(app_private.session_is_denied(NULL)
            AND app_private.session_is_denied('00000000-0000-0000-0000-000000000000'),
            'Null and nil sessions deny');
        PERFORM pg_temp.require(app_private.session_is_denied(
            '10000000-0000-4000-8000-000000000002')
            AND app_private.session_is_denied('10000000-0000-4000-8000-000000000003')
            AND app_private.session_is_denied('10000000-0000-4000-8000-000000000004'),
            'Revocations deny despite expiry or account mismatch');
    END LOOP;
    FOREACH actor IN ARRAY ARRAY[
        '00000000-0000-4000-8000-000000000003',
        '00000000-0000-4000-8000-000000000004',
        '00000000-0000-4000-8000-000000000005',
        '00000000-0000-4000-8000-000000000006',
        '00000000-0000-4000-8000-000000000007'] LOOP
        PERFORM set_config('request.jwt.claims', json_build_object('sub', actor)::text, true);
        PERFORM pg_temp.require(app_private.session_is_denied(
            '10000000-0000-4000-8000-000000000001'), 'Inactive/absent internal accounts deny');
        IF actor IN ('00000000-0000-4000-8000-000000000003',
            '00000000-0000-4000-8000-000000000004',
            '00000000-0000-4000-8000-000000000005') THEN
            PERFORM pg_temp.require((SELECT count(*) = 1 FROM app_private.app_accounts),
                'Own inactive status remains readable for rejection');
        ELSE
            PERFORM pg_temp.require(NOT EXISTS (SELECT 1 FROM app_private.app_accounts),
                'Absent internal account cannot expose another account');
        END IF;
    END LOOP;
END;
$identity$;

-- Each prohibited statement must fail with insufficient_privilege, not merely
-- return no rows or fail for unrelated syntax/missing-object reasons.
DO $permissions$
DECLARE command text;
BEGIN
    FOREACH command IN ARRAY ARRAY[
        'SET ROLE postgres', 'SET ROLE fitsocial_owner', 'SET ROLE fitsocial_guard',
        'SET ROLE service_role', 'SET ROLE authenticator', 'SET ROLE authenticated',
        'SET ROLE anon', 'SET SESSION AUTHORIZATION postgres',
        'ALTER ROLE fitsocial_runtime BYPASSRLS',
        'CREATE ROLE verification_escalation', 'CREATE SCHEMA verification_escape',
        'CREATE TABLE public.verification_escape (id integer)',
        'CREATE TABLE app_private.verification_escape (id integer)',
        'CREATE FUNCTION app_private.verification_escape() RETURNS int LANGUAGE sql AS ''SELECT 1''',
        'ALTER SCHEMA app_private RENAME TO verification_escape',
        'ALTER TABLE app_private.app_accounts DISABLE ROW LEVEL SECURITY',
        'ALTER TABLE app_private.app_accounts NO FORCE ROW LEVEL SECURITY',
        'DROP POLICY app_accounts_runtime_select ON app_private.app_accounts',
        'TRUNCATE app_private.app_accounts', 'TRUNCATE app_private.revoked_sessions',
        'SELECT * FROM app_private.revoked_sessions',
        'SELECT session_id FROM app_private.revoked_sessions',
        'SELECT * FROM auth.users',
        'INSERT INTO app_private.app_accounts (id,status) VALUES (''00000000-0000-4000-8000-000000000007'',''active'')',
        'UPDATE app_private.app_accounts SET status = ''active''',
        'UPDATE app_private.app_accounts SET id = ''00000000-0000-4000-8000-000000000007''',
        'DELETE FROM app_private.app_accounts',
        'INSERT INTO app_private.revoked_sessions (session_id,account_id,token_expires_at) VALUES (''10000000-0000-4000-8000-000000000008'',''00000000-0000-4000-8000-000000000001'',now())',
        'UPDATE app_private.revoked_sessions SET token_expires_at = now()',
        'DELETE FROM app_private.revoked_sessions',
        'GRANT fitsocial_guard TO fitsocial_runtime'
    ] LOOP
        BEGIN
            EXECUTE command;
            RAISE EXCEPTION 'Prohibited runtime operation succeeded';
        EXCEPTION WHEN insufficient_privilege THEN NULL;
        END;
    END LOOP;
END;
$permissions$;
-- row_security=off does not grant bypass: a restricted query must error.
SET LOCAL row_security = off;
DO $bypass$
BEGIN
    BEGIN
        PERFORM count(*) FROM app_private.app_accounts;
        RAISE EXCEPTION 'Runtime bypassed forced RLS';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
END;
$bypass$;
SET LOCAL row_security = on;

-- TEMP is permitted by the contract. Shadow objects must not affect helpers.
CREATE TEMP TABLE app_accounts (id uuid, status text);
CREATE TEMP TABLE revoked_sessions (session_id uuid);
INSERT INTO app_accounts VALUES ('00000000-0000-4000-8000-000000000001', 'active');
CREATE FUNCTION pg_temp.actor_subject() RETURNS uuid LANGUAGE sql
AS 'SELECT ''00000000-0000-4000-8000-000000000002''::uuid';
CREATE FUNCTION pg_temp.session_is_denied(uuid) RETURNS boolean LANGUAGE sql AS 'SELECT false';
SET LOCAL search_path = pg_temp, public;
DO $shadow$
BEGIN
    PERFORM set_config('request.jwt.claims',
        '{"sub":"00000000-0000-4000-8000-000000000001"}', true);
    PERFORM pg_temp.require(app_private.actor_subject() =
        '00000000-0000-4000-8000-000000000001'::uuid
        AND app_private.session_is_denied('10000000-0000-4000-8000-000000000002'),
        'Qualified helpers resist temporary-object shadowing');
END;
$shadow$;
COMMIT;

-- These checks all run through one physical psql connection/backend PID.
BEGIN ISOLATION LEVEL READ COMMITTED;
SELECT pg_temp.require(app_private.actor_subject() IS NULL
    AND NOT EXISTS (SELECT 1 FROM app_private.app_accounts)
    AND app_private.session_is_denied('10000000-0000-4000-8000-000000000001'),
    'Identity must clear after commit');
DO $set_b$
BEGIN
    PERFORM set_config('request.jwt.claims',
        '{"sub":"00000000-0000-4000-8000-000000000002"}', true);
    PERFORM pg_temp.require((SELECT count(*) = 1 AND bool_and(id =
        '00000000-0000-4000-8000-000000000002'::uuid) FROM app_private.app_accounts),
        'Reused connection must see only B');
END;
$set_b$;
ROLLBACK;
BEGIN;
SELECT pg_temp.require(app_private.actor_subject() IS NULL
    AND NOT EXISTS (SELECT 1 FROM app_private.app_accounts), 'Identity must clear after rollback');
ROLLBACK;

-- Deliberately induce an aborted transaction, assert its exact SQLSTATE, then
-- prove the next transaction on this very connection has no inherited actor.
BEGIN;
DO $set_a$
BEGIN
    PERFORM set_config('request.jwt.claims',
        '{"sub":"00000000-0000-4000-8000-000000000001"}', true);
END;
$set_a$;
\set ON_ERROR_STOP off
SELECT 1 / 0;
\set failure_state :SQLSTATE
ROLLBACK;
\set ON_ERROR_STOP on
SELECT pg_temp.require(:'failure_state' = '22012', 'Expected division-by-zero failure');
BEGIN;
SELECT pg_temp.require(app_private.actor_subject() IS NULL
    AND NOT EXISTS (SELECT 1 FROM app_private.app_accounts), 'Identity must clear after failure');
ROLLBACK;

BEGIN;
DO $set_a$
BEGIN
    PERFORM set_config('request.jwt.claims',
        '{"sub":"00000000-0000-4000-8000-000000000001"}', true);
END;
$set_a$;
SET LOCAL statement_timeout = '50ms';
\set ON_ERROR_STOP off
SELECT pg_sleep(1);
\set failure_state :SQLSTATE
ROLLBACK;
\set ON_ERROR_STOP on
SELECT pg_temp.require(:'failure_state' = '57014', 'Expected statement cancellation');
BEGIN;
SELECT pg_temp.require(app_private.actor_subject() IS NULL
    AND NOT EXISTS (SELECT 1 FROM app_private.app_accounts)
    AND app_private.session_is_denied('10000000-0000-4000-8000-000000000001'),
    'Identity must clear after cancellation');
SELECT pg_temp.require(pg_backend_pid() = :initial_backend_pid, 'Physical backend must be reused');
ROLLBACK;
