-- Synthetic data only, in the runner's brand-new throwaway cluster.
DO $check$
BEGIN
    IF current_setting('fitsocial.disposable', true) IS DISTINCT FROM 'task045c'
        OR current_user <> 'postgres' THEN
        RAISE EXCEPTION 'Disposable fixture context required';
    END IF;
END;
$check$;
BEGIN;
INSERT INTO auth.users (id)
SELECT ('00000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid
FROM generate_series(1, 6) AS n;
INSERT INTO app_private.app_accounts (id, status) VALUES
    ('00000000-0000-4000-8000-000000000001', 'active'),
    ('00000000-0000-4000-8000-000000000002', 'active'),
    ('00000000-0000-4000-8000-000000000003', 'deactivated'),
    ('00000000-0000-4000-8000-000000000004', 'suspended'),
    ('00000000-0000-4000-8000-000000000005', 'deleted');
-- Session 1: unrevoked. 2: revoked A. 3: expired revocation A.
-- Session 4: belongs to B, but must also deny under A's context.
INSERT INTO app_private.revoked_sessions
    (session_id, account_id, revoked_at, token_expires_at) VALUES
    ('10000000-0000-4000-8000-000000000002',
     '00000000-0000-4000-8000-000000000001', now() - interval '1 hour',
     now() + interval '1 hour'),
    ('10000000-0000-4000-8000-000000000003',
     '00000000-0000-4000-8000-000000000001', now() - interval '2 hours',
     now() - interval '1 hour'),
    ('10000000-0000-4000-8000-000000000004',
     '00000000-0000-4000-8000-000000000002', now(), now() + interval '1 hour');
DO $constraints$
BEGIN
    BEGIN
        INSERT INTO app_private.app_accounts (id, status)
        VALUES ('00000000-0000-4000-8000-000000000007', 'active');
        RAISE EXCEPTION 'Missing Auth FK was accepted';
    EXCEPTION WHEN foreign_key_violation THEN NULL;
    END;
    BEGIN
        UPDATE app_private.app_accounts SET status = 'invalid';
        RAISE EXCEPTION 'Invalid account status was accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        UPDATE app_private.app_accounts SET updated_at = created_at - interval '1 second';
        RAISE EXCEPTION 'Invalid account timestamps were accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO app_private.revoked_sessions
        SELECT * FROM app_private.revoked_sessions LIMIT 1;
        RAISE EXCEPTION 'Duplicate session was accepted';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    BEGIN
        UPDATE app_private.revoked_sessions SET token_expires_at = revoked_at - interval '1 second';
        RAISE EXCEPTION 'Invalid revocation timestamps were accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        DELETE FROM auth.users WHERE id = '00000000-0000-4000-8000-000000000001';
        RAISE EXCEPTION 'Auth FK deletion restriction was bypassed';
    EXCEPTION WHEN foreign_key_violation THEN NULL;
    END;
    BEGIN
        DELETE FROM app_private.app_accounts WHERE id = '00000000-0000-4000-8000-000000000001';
        RAISE EXCEPTION 'Revocation FK deletion restriction was bypassed';
    EXCEPTION WHEN foreign_key_violation THEN NULL;
    END;
END;
$constraints$;
COMMIT;
