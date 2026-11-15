-- FitSocial Task 007G: catalog inspection only. Prepared locally; NOT executed.
-- Target: PostgreSQL 17; catalog/syntax compatibility reviewed against its docs,
-- without SQL execution. Intended review target: fitsocial-migration-test.
-- Supports pre-migration inventory and post-migration inspection; see expectations
-- at the end. This file does not apply the migration or select a phase for you.
-- Project identity must be confirmed outside SQL (hosted projects commonly share
-- the database name postgres). Use the controlled migration/admin connection.
-- No application rows, credentials, JWT settings, pg_authid, helper invocations,
-- SET ROLE, DDL, DML, repairs, or external connections occur in this script.
-- Results are evidence for manual comparison with
-- supabase/migrations/20261112000100_security_foundation.sql,
-- not a pass/fail certification or a replacement for restricted-login tests.
-- Missing objects produce missing inventory rows; interpret them for the phase.
-- Use a fresh transaction: an enclosing transaction can defeat BEGIN's modes.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '5s';
SET LOCAL search_path = pg_catalog, pg_temp;

-- 01: connection context. Do not infer project identity from database name.
SELECT current_database() AS database_name, current_user AS inspection_role,
       session_user AS login_role, current_setting('server_version') AS server_version,
       current_setting('server_version_num') AS server_version_num,
       current_setting('transaction_read_only') AS transaction_read_only,
       pg_catalog.pg_is_in_recovery() AS in_recovery;

-- 02: role inventory, including explicit absence and non-secret attributes.
-- The three fitsocial_* roles are expected absent before bootstrap, present after.
SELECT expected.name AS expected_role, r.oid IS NOT NULL AS present,
       r.rolcanlogin, r.rolinherit, r.rolsuper, r.rolbypassrls,
       r.rolcreatedb, r.rolcreaterole, r.rolreplication, r.rolconnlimit
FROM (VALUES ('fitsocial_owner'), ('fitsocial_guard'), ('fitsocial_runtime'),
             ('postgres'), ('anon'), ('authenticated'), ('service_role'),
             ('authenticator')) AS expected(name)
LEFT JOIN pg_catalog.pg_roles r ON r.rolname = expected.name
ORDER BY expected.name;

-- 03: every membership edge, including platform-added edges. PostgreSQL 17 has
-- per-membership INHERIT/SET options; rolinherit alone does not describe access.
SELECT granted.rolname AS granted_role, member.rolname AS member_role,
       grantor.rolname AS grantor_role, m.admin_option,
       m.inherit_option, m.set_option
FROM pg_catalog.pg_auth_members m
JOIN pg_catalog.pg_roles granted ON granted.oid = m.roleid
JOIN pg_catalog.pg_roles member ON member.oid = m.member
LEFT JOIN pg_catalog.pg_roles grantor ON grantor.oid = m.grantor
ORDER BY granted.rolname, member.rolname, grantor.rolname;

-- 04: transitive membership paths touching application roles. These are catalog
-- paths, not proof that each edge permits inheritance or SET ROLE; use section 03.
WITH RECURSIVE paths AS (
    SELECT m.member AS start_role, m.roleid AS reached_role,
           ARRAY[m.member, m.roleid] AS visited
    FROM pg_catalog.pg_auth_members m
    UNION ALL
    SELECT p.start_role, m.roleid, p.visited || m.roleid
    FROM paths p JOIN pg_catalog.pg_auth_members m ON m.member = p.reached_role
    WHERE NOT m.roleid = ANY(p.visited)
)
SELECT start.rolname AS member_role, reached.rolname AS reachable_role,
       ARRAY(SELECT r.rolname FROM unnest(p.visited) WITH ORDINALITY AS v(oid, n)
             JOIN pg_catalog.pg_roles r ON r.oid = v.oid ORDER BY v.n) AS membership_path
FROM paths p
JOIN pg_catalog.pg_roles start ON start.oid = p.start_role
JOIN pg_catalog.pg_roles reached ON reached.oid = p.reached_role
WHERE start.rolname IN ('fitsocial_owner', 'fitsocial_guard', 'fitsocial_runtime')
   OR reached.rolname IN ('fitsocial_owner', 'fitsocial_guard', 'fitsocial_runtime')
ORDER BY member_role, reachable_role, membership_path;

-- 05: private schema and ALL relations (unexpected objects remain visible).
SELECT n.nspname, pg_catalog.pg_get_userbyid(n.nspowner) AS owner,
       n.nspacl AS explicit_acl
FROM pg_catalog.pg_namespace n WHERE n.nspname = 'app_private';
SELECT c.relname, c.relkind, pg_catalog.pg_get_userbyid(c.relowner) AS owner,
       c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced,
       c.relacl AS explicit_acl
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'app_private' ORDER BY c.relname;

-- 06: column metadata/ACLs, constraints, indexes, policies and user triggers.
SELECT c.relname, a.attname, pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
       a.attnotnull, pg_catalog.pg_get_expr(d.adbin, d.adrelid) AS default_expression,
       a.attacl AS column_acl
FROM pg_catalog.pg_attribute a
JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
WHERE n.nspname = 'app_private' AND a.attnum > 0 AND NOT a.attisdropped
ORDER BY c.relname, a.attnum;
SELECT c.relname, con.conname, con.contype, con.convalidated,
       pg_catalog.pg_get_constraintdef(con.oid, true) AS definition
FROM pg_catalog.pg_constraint con
JOIN pg_catalog.pg_class c ON c.oid = con.conrelid
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'app_private' ORDER BY c.relname, con.conname;
SELECT c.relname, i.indisvalid, i.indisready,
       pg_catalog.pg_get_indexdef(i.indexrelid) AS definition
FROM pg_catalog.pg_index i
JOIN pg_catalog.pg_class c ON c.oid = i.indrelid
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'app_private' ORDER BY c.relname, i.indexrelid;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_catalog.pg_policies WHERE schemaname = 'app_private'
ORDER BY tablename, policyname;
SELECT c.relname, t.tgname, t.tgenabled,
       pg_catalog.pg_get_triggerdef(t.oid, true) AS definition
FROM pg_catalog.pg_trigger t
JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'app_private' AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;

-- 07: all private routines, including overloads; security metadata only.
-- No full definitions or function bodies are selected or reconstructed.
SELECT p.oid::regprocedure::text AS signature,
       pg_catalog.pg_get_userbyid(p.proowner) AS owner, l.lanname AS language,
       p.prokind AS routine_kind, p.prorettype::regtype::text AS return_type,
       p.prosecdef AS security_definer, p.proisstrict AS strict,
       p.provolatile AS volatility, p.proleakproof, p.proconfig,
       p.proacl AS explicit_acl
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
JOIN pg_catalog.pg_language l ON l.oid = p.prolang
WHERE n.nspname = 'app_private' ORDER BY signature;

-- 08: expanded ACLs. NULL ACLs use PostgreSQL object defaults, including PUBLIC
-- function EXECUTE; empty ACLs stay empty. Owner powers also require review.
WITH objects AS (
    SELECT 'schema' AS kind, n.nspname::text AS object_name,
           n.nspowner AS owner, coalesce(n.nspacl, acldefault('n', n.nspowner)) AS acl
    FROM pg_catalog.pg_namespace n WHERE n.nspname = 'app_private'
    UNION ALL
    SELECT 'relation', c.oid::regclass::text, c.relowner,
           coalesce(c.relacl, acldefault(CASE WHEN c.relkind = 'S' THEN 's'::"char"
                                             ELSE 'r'::"char" END, c.relowner))
    FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'app_private'
    UNION ALL
    SELECT 'function', p.oid::regprocedure::text, p.proowner,
           coalesce(p.proacl, acldefault('f', p.proowner))
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'app_private'
)
SELECT o.kind, o.object_name, pg_catalog.pg_get_userbyid(o.owner) AS owner,
       CASE WHEN x.grantee = 0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(x.grantee) END AS grantee,
       pg_catalog.pg_get_userbyid(x.grantor) AS grantor, x.privilege_type, x.is_grantable
FROM objects o CROSS JOIN LATERAL pg_catalog.aclexplode(o.acl) x
ORDER BY o.kind, o.object_name, grantee, x.privilege_type;

-- 09: effective privileges incorporate PUBLIC, inherited grants and superuser
-- powers. They do not prove RLS behavior or include optional SET ROLE paths.
WITH principals AS (
    SELECT oid, rolname FROM pg_catalog.pg_roles
    WHERE rolname IN ('fitsocial_runtime', 'fitsocial_guard', 'fitsocial_owner',
                     'anon', 'authenticated', 'service_role', 'authenticator')
)
SELECT r.rolname, n.nspname,
       has_schema_privilege(r.oid, n.oid, 'USAGE') AS usage,
       has_schema_privilege(r.oid, n.oid, 'CREATE') AS create_objects
FROM principals r CROSS JOIN pg_catalog.pg_namespace n
WHERE n.nspname = 'app_private' ORDER BY r.rolname;
SELECT r.rolname, c.relname, privilege.name AS privilege,
       has_table_privilege(r.oid, c.oid, privilege.name) AS effective_table_privilege,
       CASE WHEN privilege.name IN ('SELECT', 'INSERT', 'UPDATE', 'REFERENCES')
            THEN has_any_column_privilege(r.oid, c.oid, privilege.name)
       END AS effective_any_column_privilege
FROM pg_catalog.pg_roles r
CROSS JOIN pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'),
                   ('TRUNCATE'), ('REFERENCES'), ('TRIGGER'), ('MAINTAIN')) AS privilege(name)
WHERE n.nspname = 'app_private' AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
  AND r.rolname IN ('fitsocial_runtime', 'fitsocial_guard', 'fitsocial_owner',
                   'anon', 'authenticated', 'service_role', 'authenticator')
ORDER BY r.rolname, c.relname, privilege.name;
SELECT r.rolname, p.oid::regprocedure::text AS signature,
       has_function_privilege(r.oid, p.oid, 'EXECUTE') AS effective_execute
FROM pg_catalog.pg_roles r CROSS JOIN pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'app_private'
  AND r.rolname IN ('fitsocial_runtime', 'fitsocial_guard', 'fitsocial_owner',
                   'anon', 'authenticated', 'service_role', 'authenticator')
ORDER BY r.rolname, signature;

-- 10: all explicit default ACLs (global and schema-specific), including PUBLIC.
SELECT pg_catalog.pg_get_userbyid(d.defaclrole) AS creator_role,
       CASE WHEN d.defaclnamespace = 0 THEN '(global)' ELSE n.nspname END AS scope,
       d.defaclobjtype, d.defaclacl AS acl
FROM pg_catalog.pg_default_acl d
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = d.defaclnamespace
ORDER BY creator_role, scope, d.defaclobjtype;

-- 11: publications, explicit schema mappings, and expanded table membership.
-- Inspect pg_publication_namespace even for empty schemas: the table view only
-- lists currently eligible tables, whereas a schema mapping also covers future
-- tables. These are PostgreSQL 17 catalogs/views; no private table rows are read.
SELECT pubname, pg_catalog.pg_get_userbyid(pubowner) AS owner,
       puballtables, pubinsert, pubupdate, pubdelete, pubtruncate
FROM pg_catalog.pg_publication ORDER BY pubname;
SELECT p.pubname, n.nspname AS schemaname,
       n.nspname = 'app_private' AS includes_app_private_schema
FROM pg_catalog.pg_publication_namespace pn
JOIN pg_catalog.pg_publication p ON p.oid = pn.pnpubid
JOIN pg_catalog.pg_namespace n ON n.oid = pn.pnnspid
ORDER BY p.pubname, n.nspname;
SELECT pubname, schemaname, tablename
FROM pg_catalog.pg_publication_tables ORDER BY pubname, schemaname, tablename;

-- 12: runtime's effective platform schema/database access via PUBLIC or grants.
SELECT r.rolname, n.nspname,
       has_schema_privilege(r.oid, n.oid, 'USAGE') AS usage,
       has_schema_privilege(r.oid, n.oid, 'CREATE') AS create_objects
FROM pg_catalog.pg_roles r CROSS JOIN pg_catalog.pg_namespace n
WHERE r.rolname = 'fitsocial_runtime' ORDER BY n.nspname;
SELECT r.rolname, d.datname,
       has_database_privilege(r.oid, d.oid, 'CONNECT') AS connect,
       has_database_privilege(r.oid, d.oid, 'CREATE') AS create_schema,
       has_database_privilege(r.oid, d.oid, 'TEMP') AS temporary_objects,
       d.datacl AS database_acl
FROM pg_catalog.pg_roles r CROSS JOIN pg_catalog.pg_database d
WHERE r.rolname = 'fitsocial_runtime' AND d.datname = current_database();

-- 13: only schema-exposure/search-path configuration; never dump all settings.
-- Absent pgrst.db_schemas is inconclusive: dashboard/service configuration must
-- separately confirm app_private is not exposed through the Data API.
SELECT name, setting, source FROM pg_catalog.pg_settings
WHERE name IN ('pgrst.db_schemas', 'search_path', 'row_security') ORDER BY name;
SELECT coalesce(r.rolname, '(all roles)') AS role_name,
       coalesce(d.datname, '(all databases)') AS database_name, config AS setting
FROM pg_catalog.pg_db_role_setting s
LEFT JOIN pg_catalog.pg_roles r ON r.oid = s.setrole
LEFT JOIN pg_catalog.pg_database d ON d.oid = s.setdatabase
CROSS JOIN LATERAL unnest(s.setconfig) AS config
WHERE split_part(config, '=', 1) IN ('pgrst.db_schemas', 'search_path', 'row_security')
ORDER BY role_name, database_name, config;

-- PRE-MIGRATION expectations (fresh bootstrap): all three fitsocial_* roles and
-- app_private are absent. Empty private-object and runtime-privilege result sets
-- are expected, not evidence of missing post-migration grants. Existing reserved
-- roles/schema require separate review; this file does not authorize adoption.
-- A FOR ALL TABLES publication blocks bootstrap even when no private tables exist.
-- This catalog inventory does not replace security_preflight.sql capability checks.
--
-- POST-MIGRATION expectations: all three application roles exist; app_private and
-- its two tables are owned by fitsocial_owner; both tables ENABLE/FORCE RLS.
-- Expect three SELECT policies and two functions: actor_subject() returns uuid,
-- is owned by fitsocial_owner, is invoker, and pins search_path; session_is_denied(uuid)
-- returns boolean, is owned by fitsocial_guard, is definer/non-strict, and pins
-- search_path plus row_security=on. Both functions are STABLE. Compare role flags,
-- memberships, constraints, ACLs and effective privileges with the migration.
-- Runtime must have no memberships. Review every membership path into owner/guard
-- for trusted migration access only, including platform/creator-added edges.
-- No FOR ALL TABLES publication, app_private schema publication mapping, or
-- app_private table in expanded publication membership is acceptable.
-- Missing/unexpected post-migration objects, grants or exposure require review.
--
-- LIMITATIONS: metadata only, no automatic pass/fail or function-body comparison;
-- no proof of runtime login, RLS behavior, helper behavior, Data API configuration,
-- project identity, pooler behavior or durability. Privilege visibility depends
-- on the inspection principal. Errors/timeouts or incomplete results must not be
-- treated as a pass. Older PostgreSQL versions are not a compatibility target.
ROLLBACK;
