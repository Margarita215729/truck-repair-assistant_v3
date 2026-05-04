-- ─────────────────────────────────────────────────────────────────────────────
-- 023_admin_accounts_and_sessions_rpcs.sql
-- Adds two SECURITY DEFINER RPCs for the Admin Users tab:
--   get_all_accounts()     → full user list from auth.users + subscriptions
--   get_login_sessions()   → recent sign-in sessions from auth.sessions
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. get_all_accounts ──────────────────────────────────────────────────────
-- Returns every auth user joined with their subscription plan/status.
-- Uses SECURITY DEFINER so the client never touches auth.users directly.
CREATE OR REPLACE FUNCTION public.get_all_accounts(p_limit int DEFAULT 500)
RETURNS TABLE(
  user_id        uuid,
  email          text,
  plan           text,
  sub_status     text,
  last_sign_in   timestamptz,
  signed_up_at   timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT
    u.id                                            AS user_id,
    u.email                                         AS email,
    COALESCE(s.plan::text,  'none')                 AS plan,
    COALESCE(s.status::text, 'none')               AS sub_status,
    u.last_sign_in_at                               AS last_sign_in,
    u.created_at                                    AS signed_up_at
  FROM auth.users u
  LEFT JOIN public.subscriptions s ON s.user_id = u.id
  WHERE is_marketing_admin()
  ORDER BY u.created_at DESC
  LIMIT p_limit;
$$;

REVOKE EXECUTE ON FUNCTION public.get_all_accounts(int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_all_accounts(int) TO authenticated;

-- ── 2. get_login_sessions ────────────────────────────────────────────────────
-- Returns recent auth sessions (each row = one sign-in).
-- auth.sessions.created_at is the sign-in timestamp.
CREATE OR REPLACE FUNCTION public.get_login_sessions(p_limit int DEFAULT 200)
RETURNS TABLE(
  session_id   uuid,
  user_id      uuid,
  email        text,
  signed_in_at timestamptz,
  refreshed_at timestamptz,
  ip           text,
  user_agent   text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT
    ses.id                      AS session_id,
    ses.user_id                 AS user_id,
    u.email                     AS email,
    ses.created_at              AS signed_in_at,
    ses.refreshed_at            AS refreshed_at,
    ses.ip::text                AS ip,
    ses.user_agent              AS user_agent
  FROM auth.sessions ses
  JOIN auth.users u ON u.id = ses.user_id
  WHERE is_marketing_admin()
  ORDER BY ses.created_at DESC
  LIMIT p_limit;
$$;

REVOKE EXECUTE ON FUNCTION public.get_login_sessions(int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_login_sessions(int) TO authenticated;
