-- Migration 025: App Store demo account — Fleet subscription + sample trucks/diagnostics
-- Target user: local.admin@truckassist.app (create in Supabase Auth if missing)

DO $$
DECLARE
  v_user_id UUID;
  v_truck_primary UUID;
  v_truck_secondary UUID;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'local.admin@truckassist.app';

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Demo user local.admin@truckassist.app not found. Create via Supabase Dashboard → Authentication → Users → Add user.';
    RETURN;
  END IF;

  INSERT INTO public.profiles (id, full_name, company_name, role, preferred_language)
  VALUES (v_user_id, 'App Store Reviewer', 'TRA Demo Fleet', 'fleet_manager', 'en')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    company_name = EXCLUDED.company_name,
    role = EXCLUDED.role,
    updated_at = now();

  INSERT INTO public.subscriptions (user_id, plan, status, current_period_start, current_period_end)
  VALUES (
    v_user_id,
    'fleet',
    'active',
    now(),
    now() + interval '1 year'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan = 'fleet',
    status = 'active',
    current_period_start = COALESCE(public.subscriptions.current_period_start, now()),
    current_period_end = COALESCE(public.subscriptions.current_period_end, now() + interval '1 year'),
    updated_at = now();

  SELECT id INTO v_truck_primary
  FROM public.trucks
  WHERE user_id = v_user_id AND vin = '1FUJGLDR5MS123456'
  LIMIT 1;

  IF v_truck_primary IS NULL THEN
    INSERT INTO public.trucks (
      user_id, nickname, manufacturer, model, year, vin, mileage, engine_type, is_primary, notes
    )
    VALUES (
      v_user_id,
      'Unit 101',
      'Freightliner',
      'Cascadia',
      2021,
      '1FUJGLDR5MS123456',
      412000,
      'Detroit DD15',
      true,
      'Demo truck for App Store review — SPN 4364 / FMI 18 sample fault'
    )
    RETURNING id INTO v_truck_primary;
  END IF;

  SELECT id INTO v_truck_secondary
  FROM public.trucks
  WHERE user_id = v_user_id AND vin = '1XKYDP9X9KJ654321'
  LIMIT 1;

  IF v_truck_secondary IS NULL THEN
    INSERT INTO public.trucks (
      user_id, nickname, manufacturer, model, year, vin, mileage, engine_type, is_primary, notes
    )
    VALUES (
      v_user_id,
      'Unit 204',
      'Kenworth',
      'T680',
      2019,
      '1XKYDP9X9KJ654321',
      528000,
      'PACCAR MX-13',
      false,
      'Backup unit — DEF system maintenance due'
    )
    RETURNING id INTO v_truck_secondary;
  END IF;

  IF v_truck_primary IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.conversations
    WHERE user_id = v_user_id AND title = 'SPN 4364 — DEF Quality Warning'
  ) THEN
    INSERT INTO public.conversations (
      user_id,
      truck_id,
      title,
      truck_make,
      truck_model,
      truck_year,
      status,
      error_codes,
      symptoms,
      messages
    )
    VALUES (
      v_user_id,
      v_truck_primary,
      'SPN 4364 — DEF Quality Warning',
      'Freightliner',
      'Cascadia',
      2021,
      'active',
      ARRAY['SPN 4364 FMI 18', 'P20EE'],
      ARRAY['Check engine light', 'Reduced engine power', 'DEF warning on dash'],
      '[
        {"role":"user","content":"Unit 101 showing SPN 4364 FMI 18 after fuel stop in Ohio. Engine derated to 55 mph."},
        {"role":"assistant","content":"SPN 4364 indicates DEF quality issue. Check DEF tank contamination, run DEF refractometer test (32.5% urea), inspect DEF injector and SCR catalyst. If DEF is diluted, drain tank and refill with API-certified DEF. Clear codes after repair and verify NOx sensor readings."}
      ]'::jsonb
    );
  END IF;

  IF v_truck_primary IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.diagnostic_reports
    WHERE user_id = v_user_id AND title = 'SPN 4364 — DEF Quality Analysis'
  ) THEN
    INSERT INTO public.diagnostic_reports (
      user_id,
      truck_id,
      title,
      error_codes,
      summary,
      severity,
      content
    )
    VALUES (
      v_user_id,
      v_truck_primary,
      'SPN 4364 — DEF Quality Analysis',
      ARRAY['SPN 4364 FMI 18'],
      'DEF quality sensor reporting out-of-spec urea concentration. Likely contaminated DEF or degraded fluid.',
      'high',
      '{"recommended_actions":["Test DEF concentration","Drain and refill DEF tank","Inspect DEF doser injector","Verify SCR efficiency after repair"],"estimated_repair_hours":2.5}'::jsonb
    );
  END IF;

  RAISE NOTICE 'Demo account seeded for user_id=%', v_user_id;
END $$;
