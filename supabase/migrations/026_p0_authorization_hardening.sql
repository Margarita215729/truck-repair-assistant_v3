-- P0 authorization hardening after the August 2026 client-bundle credential incident.
-- Prevents self-assigned admin roles, client-side usage-counter tampering,
-- and cross-user parts inserts.

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', pg_catalog.split_part(NEW.email, '@', 1)),
    'technician'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.subscriptions (user_id, plan, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.usage_tracking (user_id, date, ai_requests_count)
  VALUES (NEW.id, CURRENT_DATE, 0)
  ON CONFLICT (user_id, date) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin, service_role;

-- Profiles: authenticated users may edit only non-privileged presentation fields.
REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT INSERT (id, full_name, phone, company_name, avatar_url, preferred_language, notification_preferences)
  ON public.profiles TO authenticated;
GRANT UPDATE (full_name, phone, company_name, avatar_url, preferred_language, notification_preferences)
  ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- This function bypasses recursive profile RLS, while role itself is now immutable to clients.
CREATE OR REPLACE FUNCTION public.is_marketing_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'marketing_analyst')
  );
$$;

REVOKE ALL ON FUNCTION public.is_marketing_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_marketing_admin() TO authenticated, service_role;

-- Usage counters are read-only to clients. The guarded SECURITY DEFINER RPCs and
-- server-side secret-key clients remain able to manage them.
REVOKE ALL PRIVILEGES ON TABLE public.usage_tracking FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.usage_tracking TO authenticated;
DROP POLICY IF EXISTS "Users can insert own usage" ON public.usage_tracking;
DROP POLICY IF EXISTS "Users can update own usage" ON public.usage_tracking;
DROP POLICY IF EXISTS "Users can update own usage via RPC only" ON public.usage_tracking;
DROP POLICY IF EXISTS "Users can view own usage" ON public.usage_tracking;
CREATE POLICY "Users can view own usage"
  ON public.usage_tracking FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

ALTER TABLE public.usage_tracking
  DROP CONSTRAINT IF EXISTS usage_tracking_ai_requests_count_nonnegative;
ALTER TABLE public.usage_tracking
  ADD CONSTRAINT usage_tracking_ai_requests_count_nonnegative
  CHECK (ai_requests_count >= 0) NOT VALID;
ALTER TABLE public.usage_tracking
  VALIDATE CONSTRAINT usage_tracking_ai_requests_count_nonnegative;

ALTER FUNCTION public.check_ai_limit(uuid) SET search_path = pg_catalog, public, auth;
ALTER FUNCTION public.increment_ai_usage(uuid) SET search_path = pg_catalog, public, auth;
REVOKE ALL ON FUNCTION public.check_ai_limit(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_ai_usage(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_ai_limit(uuid), public.increment_ai_usage(uuid)
  TO authenticated, service_role;

-- Parts are private user records; remove the older policy that accepted any owner id.
REVOKE ALL PRIVILEGES ON TABLE public.parts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.parts TO authenticated;
DROP POLICY IF EXISTS "Authenticated users can view all parts" ON public.parts;
DROP POLICY IF EXISTS "Authenticated users can insert parts" ON public.parts;
DROP POLICY IF EXISTS "Users can update parts they added" ON public.parts;
DROP POLICY IF EXISTS "users_read_own_parts" ON public.parts;
DROP POLICY IF EXISTS "users_insert_own_parts" ON public.parts;
DROP POLICY IF EXISTS "users_update_own_parts" ON public.parts;
DROP POLICY IF EXISTS "users_delete_own_parts" ON public.parts;
CREATE POLICY "users_read_own_parts"
  ON public.parts FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "users_insert_own_parts"
  ON public.parts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_update_own_parts"
  ON public.parts FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_delete_own_parts"
  ON public.parts FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Fail the transaction if any critical invariant was not achieved.
DO $$
BEGIN
  IF has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE') THEN
    RAISE EXCEPTION 'P0 failed: role remains client-updatable';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.profiles', 'full_name', 'UPDATE') THEN
    RAISE EXCEPTION 'P0 failed: safe profile updates unavailable';
  END IF;
  IF has_table_privilege('authenticated', 'public.usage_tracking', 'INSERT')
     OR has_table_privilege('authenticated', 'public.usage_tracking', 'UPDATE') THEN
    RAISE EXCEPTION 'P0 failed: usage counters remain writable';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'parts'
      AND policyname = 'Authenticated users can insert parts'
  ) THEN
    RAISE EXCEPTION 'P0 failed: broad parts insert remains';
  END IF;
  IF position(
    'raw_user_meta_data->>''role'''
    IN pg_get_functiondef('public.handle_new_user()'::regprocedure)
  ) > 0 THEN
    RAISE EXCEPTION 'P0 failed: signup metadata still controls role';
  END IF;
END;
$$;

COMMIT;
