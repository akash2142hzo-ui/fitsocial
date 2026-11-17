-- Automatic assertions complement the existing read-only catalog inventory.
-- Run only as admin in the disposable runner, after the unchanged migration.
BEGIN READ ONLY;
DO $catalog$
DECLARE
    principal text;
    object_name text;
    privilege_name text;
BEGIN
    IF current_setting('fitsocial.disposable', true) IS DISTINCT FROM 'task045c' THEN
        RAISE EXCEPTION 'Disposable assertion context required';
    END IF;
    IF (SELECT count(*) FROM pg_roles WHERE rolname IN
        ('fitsocial_owner', 'fitsocial_guard', 'fitsocial_runtime')) <> 3
        OR EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN
        ('fitsocial_owner', 'fitsocial_guard', 'fitsocial_runtime') AND
        (rolsuper OR rolbypassrls OR rolcreatedb OR rolcreaterole OR rolreplication
         OR rolinherit OR rolcanlogin <> (rolname = 'fitsocial_runtime'))) THEN
        RAISE EXCEPTION 'Application role attribute mismatch';
    END IF;
    -- Check every incoming and outgoing membership, not only NOINHERIT.
    IF EXISTS (
        SELECT 1 FROM pg_auth_members m
        JOIN pg_roles member ON member.oid = m.member
        JOIN pg_roles granted ON granted.oid = m.roleid
        WHERE member.rolname IN ('fitsocial_owner', 'fitsocial_guard', 'fitsocial_runtime')
           OR (granted.rolname IN ('fitsocial_owner', 'fitsocial_guard', 'fitsocial_runtime')
               AND (member.rolname <> 'postgres' OR granted.rolname = 'fitsocial_runtime'))
    ) OR (SELECT count(*) FROM pg_auth_members m
        JOIN pg_roles member ON member.oid = m.member
        JOIN pg_roles granted ON granted.oid = m.roleid
        WHERE member.rolname = 'postgres'
          AND granted.rolname IN ('fitsocial_owner', 'fitsocial_guard')
          AND m.inherit_option AND m.set_option) <> 2 THEN
        RAISE EXCEPTION 'Unexpected application membership path';
    END IF;
    IF (SELECT nspowner FROM pg_namespace WHERE nspname = 'app_private')
        IS DISTINCT FROM 'fitsocial_owner'::regrole::oid
        OR (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'app_private' AND c.relkind = 'r') <> 2
        OR EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'app_private' AND c.relkind = 'r'
              AND (c.relowner <> 'fitsocial_owner'::regrole
                   OR NOT c.relrowsecurity OR NOT c.relforcerowsecurity)) THEN
        RAISE EXCEPTION 'Schema/table ownership or forced RLS mismatch';
    END IF;
    IF (SELECT count(*) FROM pg_policy WHERE polrelid IN
        ('app_private.app_accounts'::regclass, 'app_private.revoked_sessions'::regclass)) <> 3
        OR EXISTS (SELECT 1 FROM pg_policy WHERE polrelid IN
        ('app_private.app_accounts'::regclass, 'app_private.revoked_sessions'::regclass)
        AND polcmd <> 'r') THEN
        RAISE EXCEPTION 'Unexpected application policies';
    END IF;
    IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'app_private') <> 2
        OR NOT EXISTS (SELECT 1 FROM pg_proc WHERE
            oid = 'app_private.actor_subject()'::regprocedure
            AND proowner = 'fitsocial_owner'::regrole AND NOT prosecdef
            AND provolatile = 's' AND prorettype = 'uuid'::regtype
            AND proconfig = ARRAY['search_path=pg_catalog, pg_temp'])
        OR NOT EXISTS (SELECT 1 FROM pg_proc WHERE
            oid = 'app_private.session_is_denied(uuid)'::regprocedure
            AND proowner = 'fitsocial_guard'::regrole AND prosecdef AND NOT proisstrict
            AND provolatile = 's' AND prorettype = 'boolean'::regtype
            AND proconfig @> ARRAY['search_path=pg_catalog, pg_temp', 'row_security=on']
            AND cardinality(proconfig) = 2) THEN
        RAISE EXCEPTION 'Helper security metadata mismatch';
    END IF;
    FOREACH principal IN ARRAY ARRAY['fitsocial_owner', 'fitsocial_guard', 'fitsocial_runtime']
    LOOP
        IF NOT has_function_privilege(principal, 'app_private.actor_subject()', 'EXECUTE')
            OR has_function_privilege(principal, 'app_private.session_is_denied(uuid)', 'EXECUTE')
                IS DISTINCT FROM (principal <> 'fitsocial_owner') THEN
            RAISE EXCEPTION 'Helper effective execution matrix mismatch';
        END IF;
    END LOOP;
    IF (SELECT count(*) FROM pg_default_acl
        WHERE defaclrole IN ('fitsocial_owner'::regrole, 'fitsocial_guard'::regrole)
          AND defaclnamespace = 0 AND defaclobjtype = 'f') <> 2
        OR EXISTS (SELECT 1 FROM pg_default_acl d
            CROSS JOIN LATERAL aclexplode(d.defaclacl) a
            WHERE d.defaclrole IN ('fitsocial_owner'::regrole, 'fitsocial_guard'::regrole)
              AND d.defaclobjtype = 'f' AND a.grantee = 0) THEN
        RAISE EXCEPTION 'Owner/guard function defaults permit PUBLIC access';
    END IF;
    -- Expand default ACLs too: a NULL function ACL grants PUBLIC EXECUTE.
    IF EXISTS (
        SELECT 1 FROM pg_namespace n
        CROSS JOIN LATERAL aclexplode(coalesce(n.nspacl, acldefault('n', n.nspowner))) a
        WHERE n.nspname = 'app_private' AND a.grantee = 0
    ) OR EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        CROSS JOIN LATERAL aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) a
        WHERE n.nspname = 'app_private' AND c.relkind = 'r' AND a.grantee = 0
    ) OR EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        CROSS JOIN LATERAL aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
        WHERE n.nspname = 'app_private' AND a.grantee = 0
    ) THEN
        RAISE EXCEPTION 'PUBLIC application-object access';
    END IF;
    FOREACH principal IN ARRAY ARRAY['anon', 'authenticated', 'service_role', 'authenticator']
    LOOP
        IF has_schema_privilege(principal, 'app_private', 'USAGE')
            OR has_schema_privilege(principal, 'app_private', 'CREATE')
            OR has_function_privilege(principal, 'app_private.actor_subject()', 'EXECUTE')
            OR has_function_privilege(principal, 'app_private.session_is_denied(uuid)', 'EXECUTE')
        THEN RAISE EXCEPTION 'Platform role private-object access'; END IF;
        FOREACH object_name IN ARRAY ARRAY['app_private.app_accounts', 'app_private.revoked_sessions']
        LOOP
            FOREACH privilege_name IN ARRAY ARRAY[
                'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN']
            LOOP
                IF has_table_privilege(principal, object_name, privilege_name) THEN
                    RAISE EXCEPTION 'Platform role private-table privilege';
                END IF;
            END LOOP;
            IF has_any_column_privilege(principal, object_name, 'SELECT,INSERT,UPDATE,REFERENCES') THEN
                RAISE EXCEPTION 'Platform role private-column privilege';
            END IF;
        END LOOP;
    END LOOP;
    FOREACH principal IN ARRAY ARRAY['fitsocial_guard', 'fitsocial_runtime'] LOOP
        IF NOT has_schema_privilege(principal, 'app_private', 'USAGE')
            OR has_schema_privilege(principal, 'app_private', 'CREATE')
            OR has_schema_privilege(principal, 'auth', 'USAGE')
            OR has_database_privilege(principal, current_database(), 'CREATE') THEN
            RAISE EXCEPTION 'Application schema/database privilege mismatch';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname NOT LIKE 'pg_temp_%'
            AND nspname NOT LIKE 'pg_toast_temp_%'
            AND has_schema_privilege(principal, oid, 'CREATE')) THEN
            RAISE EXCEPTION 'Application principal can create persistent schema objects';
        END IF;
        FOREACH object_name IN ARRAY ARRAY['app_private.app_accounts', 'app_private.revoked_sessions']
        LOOP
            IF has_table_privilege(principal, object_name, 'SELECT') IS DISTINCT FROM
                (object_name = 'app_private.app_accounts' OR principal = 'fitsocial_guard') THEN
                RAISE EXCEPTION 'Application read privilege mismatch';
            END IF;
            FOREACH privilege_name IN ARRAY ARRAY[
                'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN']
            LOOP
                IF has_table_privilege(principal, object_name, privilege_name) THEN
                    RAISE EXCEPTION 'Unexpected application mutation privilege';
                END IF;
            END LOOP;
            IF has_any_column_privilege(principal, object_name, 'INSERT,UPDATE,REFERENCES') THEN
                RAISE EXCEPTION 'Unexpected application column mutation privilege';
            END IF;
        END LOOP;
    END LOOP;
    IF EXISTS (SELECT 1 FROM pg_publication WHERE puballtables)
        OR EXISTS (SELECT 1 FROM pg_publication_namespace pn
            JOIN pg_namespace n ON n.oid = pn.pnnspid WHERE n.nspname = 'app_private')
        OR EXISTS (SELECT 1 FROM pg_publication_tables WHERE schemaname = 'app_private') THEN
        RAISE EXCEPTION 'Private schema publication exposure';
    END IF;
    -- An absent setting does NOT prove hosted Data API exclusion.
    IF 'app_private' = ANY(string_to_array(replace(replace(
        coalesce(current_setting('pgrst.db_schemas', true), ''), ' ', ''), '"', ''), ','))
        OR EXISTS (SELECT 1 FROM pg_db_role_setting s
            CROSS JOIN LATERAL unnest(s.setconfig) AS setting
            WHERE split_part(setting, '=', 1) = 'pgrst.db_schemas'
              AND 'app_private' = ANY(string_to_array(replace(replace(
                  split_part(setting, '=', 2), ' ', ''), '"', ''), ','))) THEN
        RAISE EXCEPTION 'Private schema configured as exposed';
    END IF;
END;
$catalog$;
ROLLBACK;
