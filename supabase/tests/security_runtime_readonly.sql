-- Post-migration smoke checks through the ACTUAL fitsocial_runtime login.
-- Not SET ROLE under postgres. No fixture inserts, account data output or writes.
-- Separate approval is required to run this against any hosted environment.
BEGIN READ ONLY;
DO $runtime_checks$
BEGIN
    IF current_user <> 'fitsocial_runtime' OR session_user <> 'fitsocial_runtime' THEN
        RAISE EXCEPTION 'Use the actual restricted runtime login';
    END IF;
    IF EXISTS (
        SELECT 1 FROM pg_catalog.pg_roles
        WHERE rolname = current_user
            AND (rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication
                OR rolinherit OR NOT rolcanlogin)
    ) OR EXISTS (
        SELECT 1 FROM pg_catalog.pg_auth_members
        WHERE member = (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = current_user)
    ) THEN
        RAISE EXCEPTION 'Unexpected runtime role attributes or memberships';
    END IF;
    IF NOT pg_catalog.has_schema_privilege(current_user, 'app_private', 'USAGE')
        OR NOT pg_catalog.has_table_privilege(current_user, 'app_private.app_accounts', 'SELECT')
        OR NOT pg_catalog.has_function_privilege(current_user, 'app_private.actor_subject()', 'EXECUTE')
        OR NOT pg_catalog.has_function_privilege(current_user, 'app_private.session_is_denied(uuid)', 'EXECUTE') THEN
        RAISE EXCEPTION 'Missing required runtime privileges';
    END IF;
    IF pg_catalog.has_schema_privilege(current_user, 'app_private', 'CREATE')
        OR pg_catalog.has_table_privilege(current_user, 'app_private.revoked_sessions', 'SELECT')
        OR pg_catalog.has_table_privilege(current_user, 'app_private.app_accounts', 'INSERT')
        OR pg_catalog.has_table_privilege(current_user, 'app_private.app_accounts', 'UPDATE')
        OR pg_catalog.has_table_privilege(current_user, 'app_private.app_accounts', 'DELETE')
        OR pg_catalog.has_table_privilege(current_user, 'app_private.app_accounts', 'TRUNCATE')
        OR pg_catalog.has_table_privilege(current_user, 'app_private.revoked_sessions', 'INSERT')
        OR pg_catalog.has_table_privilege(current_user, 'app_private.revoked_sessions', 'UPDATE')
        OR pg_catalog.has_table_privilege(current_user, 'app_private.revoked_sessions', 'DELETE')
        OR pg_catalog.has_table_privilege(current_user, 'app_private.revoked_sessions', 'TRUNCATE')
        OR pg_catalog.has_any_column_privilege(current_user, 'app_private.app_accounts', 'INSERT')
        OR pg_catalog.has_any_column_privilege(current_user, 'app_private.app_accounts', 'UPDATE')
        OR pg_catalog.has_any_column_privilege(current_user, 'app_private.revoked_sessions', 'SELECT')
        OR pg_catalog.has_any_column_privilege(current_user, 'app_private.revoked_sessions', 'INSERT')
        OR pg_catalog.has_any_column_privilege(current_user, 'app_private.revoked_sessions', 'UPDATE') THEN
        RAISE EXCEPTION 'Unexpected application-object privileges';
    END IF;
    IF (SELECT count(*) FROM pg_catalog.pg_class AS relation
        JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = relation.relnamespace
        JOIN pg_catalog.pg_roles AS owner_role ON owner_role.oid = relation.relowner
        WHERE namespace.nspname = 'app_private'
            AND relation.relname IN ('app_accounts', 'revoked_sessions')
            AND relation.relrowsecurity AND relation.relforcerowsecurity
            AND owner_role.rolname = 'fitsocial_owner') <> 2 THEN
        RAISE EXCEPTION 'Unexpected table ownership or RLS flags';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS routine
        JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = routine.pronamespace
        JOIN pg_catalog.pg_roles AS owner_role ON owner_role.oid = routine.proowner
        WHERE routine.oid = 'app_private.session_is_denied(uuid)'::regprocedure
            AND routine.prosecdef AND NOT routine.proisstrict
            AND owner_role.rolname = 'fitsocial_guard'
            AND NOT owner_role.rolcanlogin AND NOT owner_role.rolsuper
            AND NOT owner_role.rolbypassrls
            AND 'search_path=pg_catalog, pg_temp' = ANY(routine.proconfig)
            AND 'row_security=on' = ANY(routine.proconfig)) THEN
        RAISE EXCEPTION 'Unexpected revocation helper configuration';
    END IF;
END;
$runtime_checks$;

-- Transaction-local synthetic invalid context; never output identity settings.
SET LOCAL request.jwt.claims = '';
DO $missing_context$
BEGIN
    IF app_private.actor_subject() IS NOT NULL
        OR app_private.session_is_denied(NULL) IS DISTINCT FROM true
        OR app_private.session_is_denied('11111111-1111-4111-8111-111111111111')
            IS DISTINCT FROM true
        OR EXISTS (SELECT 1 FROM app_private.app_accounts) THEN
        RAISE EXCEPTION 'Missing identity did not fail closed';
    END IF;
END;
$missing_context$;

SET LOCAL request.jwt.claims = '{invalid synthetic context';
DO $malformed_context$
BEGIN
    IF app_private.actor_subject() IS NOT NULL
        OR app_private.session_is_denied('11111111-1111-4111-8111-111111111111')
            IS DISTINCT FROM true THEN
        RAISE EXCEPTION 'Malformed identity did not fail closed';
    END IF;
END;
$malformed_context$;
SELECT true AS runtime_readonly_smoke_checks_passed;
ROLLBACK;
