-- Migration 027: Backfill application rows missing for existing auth users.
--
-- Risk: low-volume data backfill; INSERT-only and idempotent.
-- Requires: migration 026 (hardened handle_new_user trigger and RLS).
-- Rollback: the transaction rolls back automatically if verification fails.
-- After commit, do not blindly delete inserted rows: they may have become active
-- application records. Use a verified backup/PITR restore plan if reversal is needed.
--
-- Safety properties:
--   * Existing profiles are never updated, so admin and other assigned roles remain intact.
--   * Only newly-created profiles receive role = 'technician'.
--   * Existing subscription plans/statuses and usage counters are never updated.
--   * Re-running the migration inserts zero rows once all invariants are satisfied.
--
-- Read-only production snapshot at 2026-08-22 (informational, never hardcoded):
--   auth.users: 46
--   profiles: 3 rows / 43 missing; roles admin=2, fleet_manager=1
--   subscriptions: 5 rows / 41 missing
--   usage_tracking: 19 rows across 8 users / 38 users missing all usage rows
-- With no intervening writes, expected after: profiles=46, subscriptions=46,
-- usage_tracking=57 rows across 46 users. The migration computes live gaps at run time.

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL search_path = pg_catalog, public;

-- Keep a stable target population for this short transaction. New users created
-- concurrently are handled by the hardened auth.users trigger from migration 026.
CREATE TEMP TABLE migration_027_auth_users
ON COMMIT DROP
AS
SELECT
  users.id,
  users.email,
  users.raw_user_meta_data
FROM auth.users AS users;

-- Snapshot every existing role so verification can prove that no admin or other
-- pre-existing profile role changed during this migration.
CREATE TEMP TABLE migration_027_existing_profile_roles
ON COMMIT DROP
AS
SELECT profiles.id, profiles.role
FROM public.profiles AS profiles;

DO $migration$
DECLARE
  expected_profile_inserts integer;
  expected_subscription_inserts integer;
  expected_usage_inserts integer;
  inserted_profiles integer;
  inserted_subscriptions integer;
  inserted_usage_rows integer;
  target_auth_users integer;
BEGIN
  SELECT count(*)::integer
  INTO target_auth_users
  FROM pg_temp.migration_027_auth_users;

  SELECT count(*)::integer
  INTO expected_profile_inserts
  FROM pg_temp.migration_027_auth_users AS users
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.profiles AS profiles
    WHERE profiles.id = users.id
  );

  SELECT count(*)::integer
  INTO expected_subscription_inserts
  FROM pg_temp.migration_027_auth_users AS users
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.subscriptions AS subscriptions
    WHERE subscriptions.user_id = users.id
  );

  SELECT count(*)::integer
  INTO expected_usage_inserts
  FROM pg_temp.migration_027_auth_users AS users
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.usage_tracking AS usage_rows
    WHERE usage_rows.user_id = users.id
  );

  INSERT INTO public.profiles (id, email, full_name, role)
  SELECT
    users.id,
    users.email,
    COALESCE(
      NULLIF(pg_catalog.btrim(users.raw_user_meta_data ->> 'display_name'), ''),
      NULLIF(pg_catalog.btrim(users.raw_user_meta_data ->> 'full_name'), ''),
      NULLIF(pg_catalog.split_part(COALESCE(users.email, ''), '@', 1), ''),
      ''
    ),
    'technician'
  FROM pg_temp.migration_027_auth_users AS users
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.profiles AS profiles
    WHERE profiles.id = users.id
  )
  ON CONFLICT (id) DO NOTHING;
  GET DIAGNOSTICS inserted_profiles = ROW_COUNT;

  INSERT INTO public.subscriptions (user_id, plan, status)
  SELECT
    users.id,
    'free'::public.subscription_plan,
    'active'::public.subscription_status
  FROM pg_temp.migration_027_auth_users AS users
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.subscriptions AS subscriptions
    WHERE subscriptions.user_id = users.id
  )
  ON CONFLICT (user_id) DO NOTHING;
  GET DIAGNOSTICS inserted_subscriptions = ROW_COUNT;

  INSERT INTO public.usage_tracking (user_id, date, ai_requests_count)
  SELECT users.id, CURRENT_DATE, 0
  FROM pg_temp.migration_027_auth_users AS users
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.usage_tracking AS usage_rows
    WHERE usage_rows.user_id = users.id
  )
  ON CONFLICT (user_id, date) DO NOTHING;
  GET DIAGNOSTICS inserted_usage_rows = ROW_COUNT;

  -- Every user in the stable target population must now have all three records.
  IF EXISTS (
    SELECT 1
    FROM pg_temp.migration_027_auth_users AS users
    WHERE NOT EXISTS (
      SELECT 1 FROM public.profiles AS profiles WHERE profiles.id = users.id
    )
  ) THEN
    RAISE EXCEPTION 'Migration 027 verification failed: profile gaps remain';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_temp.migration_027_auth_users AS users
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.subscriptions AS subscriptions
      WHERE subscriptions.user_id = users.id
    )
  ) THEN
    RAISE EXCEPTION 'Migration 027 verification failed: subscription gaps remain';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_temp.migration_027_auth_users AS users
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.usage_tracking AS usage_rows
      WHERE usage_rows.user_id = users.id
    )
  ) THEN
    RAISE EXCEPTION 'Migration 027 verification failed: usage-tracking gaps remain';
  END IF;

  -- Prove that every profile which existed before the migration retained its role.
  IF EXISTS (
    SELECT 1
    FROM pg_temp.migration_027_existing_profile_roles AS before_roles
    JOIN public.profiles AS profiles ON profiles.id = before_roles.id
    WHERE profiles.role IS DISTINCT FROM before_roles.role
  ) THEN
    RAISE EXCEPTION 'Migration 027 verification failed: an existing profile role changed';
  END IF;

  -- Prove that only the missing profiles added by this migration use the safe default.
  IF EXISTS (
    SELECT 1
    FROM pg_temp.migration_027_auth_users AS users
    JOIN public.profiles AS profiles ON profiles.id = users.id
    LEFT JOIN pg_temp.migration_027_existing_profile_roles AS before_roles
      ON before_roles.id = users.id
    WHERE before_roles.id IS NULL
      AND profiles.role IS DISTINCT FROM 'technician'
  ) THEN
    RAISE EXCEPTION 'Migration 027 verification failed: a new profile is not technician';
  END IF;

  RAISE NOTICE
    'Migration 027 verified: auth users=%, initial gaps profiles/subscriptions/usage=%/%/%, inserted=%/%/%',
    target_auth_users,
    expected_profile_inserts,
    expected_subscription_inserts,
    expected_usage_inserts,
    inserted_profiles,
    inserted_subscriptions,
    inserted_usage_rows;
END;
$migration$;

-- Idempotent postcondition report. All three missing counts must be zero.
WITH auth_population AS (
  SELECT users.id FROM auth.users AS users
)
SELECT
  (SELECT count(*) FROM auth_population) AS auth_users,
  (SELECT count(*) FROM public.profiles AS profiles) AS profile_rows,
  (
    SELECT count(*)
    FROM auth_population AS users
    WHERE NOT EXISTS (
      SELECT 1 FROM public.profiles AS profiles WHERE profiles.id = users.id
    )
  ) AS missing_profiles,
  (SELECT count(*) FROM public.subscriptions AS subscriptions) AS subscription_rows,
  (
    SELECT count(*)
    FROM auth_population AS users
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.subscriptions AS subscriptions
      WHERE subscriptions.user_id = users.id
    )
  ) AS missing_subscriptions,
  (
    SELECT count(DISTINCT usage_rows.user_id)
    FROM public.usage_tracking AS usage_rows
  ) AS users_with_usage_tracking,
  (
    SELECT count(*)
    FROM public.usage_tracking AS usage_rows
    WHERE usage_rows.date = CURRENT_DATE
  ) AS current_date_usage_rows,
  (
    SELECT count(*)
    FROM auth_population AS users
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.usage_tracking AS usage_rows
      WHERE usage_rows.user_id = users.id
    )
  ) AS missing_usage_tracking;

COMMIT;
