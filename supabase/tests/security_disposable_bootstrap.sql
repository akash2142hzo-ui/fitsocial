-- DISPOSABLE RUNNER ONLY. Not a Supabase migration or hosted setup script.
-- Minimal Auth FK target/platform role names, not a replica of Supabase Auth.
DO $check$
BEGIN
    IF current_setting('fitsocial.disposable', true) IS DISTINCT FROM 'task045c'
        OR current_user <> 'postgres' OR current_database() <> 'postgres'
        OR current_setting('server_version_num')::integer / 10000 <> 17 THEN
        RAISE EXCEPTION 'Requires a fresh runner-owned PostgreSQL 17 instance';
    END IF;
END;
$check$;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE ROLE authenticator NOLOGIN;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
REVOKE ALL ON SCHEMA auth FROM PUBLIC;
REVOKE ALL ON TABLE auth.users FROM PUBLIC;
-- Exercise the migration's explicit revokes, not merely pristine ACL defaults.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT SELECT ON TABLES
    TO anon, authenticated, service_role, authenticator;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT EXECUTE ON FUNCTIONS
    TO anon, authenticated, service_role, authenticator;
