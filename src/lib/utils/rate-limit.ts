import { NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/** Returns true if the request is allowed, false if it should be rejected with a 429. */
export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    // Don't take down auth for everyone if the rate limiter itself is broken.
    console.error("Rate limit check failed, allowing request", error.message);
    return true;
  }

  return data as boolean;
}
