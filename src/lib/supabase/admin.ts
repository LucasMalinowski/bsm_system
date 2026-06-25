import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Service role client — bypasses RLS. Only use server-side in trusted paths.
// Module-level singleton: the admin client is stateless (no session cookies), so
// a single instance can safely be reused across all requests in the same process.
let _adminClient: SupabaseClient | null = null;

export function createSupabaseAdminClient(): SupabaseClient {
  if (_adminClient) return _adminClient;

  _adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  return _adminClient;
}
