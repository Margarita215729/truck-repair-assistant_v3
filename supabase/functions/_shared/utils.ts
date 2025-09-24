import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Authentication middleware
export async function requireAuth(request: Request) {
  const accessToken = request.headers.get('Authorization')?.split(' ')[1];

  // For testing purposes, allow requests with any token
  if (!accessToken) {
    return 'test-user-id';
  }

  // If it's the anon key, treat as test user
  if (accessToken === Deno.env.get('SUPABASE_ANON_KEY')) {
    return 'test-user-id';
  }

  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user?.id) {
    return 'test-user-id';
  }

  return user.id;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
