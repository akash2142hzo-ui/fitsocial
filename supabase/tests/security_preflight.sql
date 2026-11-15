-- READ-ONLY capability checks before any approved migration application.
-- Run as the intended migration principal, never using credentials in source.
-- All results must be true. These do not prove a future DDL operation succeeds.
BEGIN READ ONLY;
SELECT
    current_user = 'postgres' AS expected_migration_principal,
    current_database() = 'postgres' AS expected_database,
    NOT pg_catalog.pg_is_in_recovery() AS connected_to_primary,
    NOT EXISTS (SELECT 1 FROM pg_catalog.pg_publication WHERE puballtables)
        AS no_all_table_publication,
    pg_catalog.has_database_privilege(current_user, current_database(), 'CREATE')
        AS can_create_schema,
    pg_catalog.has_schema_privilege(current_user, 'auth', 'USAGE') AS can_resolve_auth,
    pg_catalog.has_column_privilege(current_user, 'auth.users', 'id', 'REFERENCES')
        AS can_reference_auth_primary_key,
    pg_catalog.has_language_privilege(current_user, 'plpgsql', 'USAGE')
        AS can_create_plpgsql_functions,
    EXISTS (SELECT 1 FROM pg_catalog.pg_roles
        WHERE rolname = current_user AND (rolcreaterole OR rolsuper))
        AS can_create_roles,
    NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles
        WHERE rolname IN ('fitsocial_owner', 'fitsocial_guard', 'fitsocial_runtime'))
        AS application_roles_absent,
    NOT EXISTS (SELECT 1 FROM pg_catalog.pg_namespace WHERE nspname = 'app_private')
        AS application_schema_absent;
ROLLBACK;
