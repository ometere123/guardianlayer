/**
 * Supabase admin client — uses service role key.
 * Supports auth.admin.* methods (inviteUserByEmail, getUserById, etc).
 * Server-side only. Never import in browser code.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
