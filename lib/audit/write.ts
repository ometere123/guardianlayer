import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type AuditEntry = {
  organisation_id?: string | null;
  actor_user_id?: string | null;
  actor_api_key_id?: string | null;
  action: string;
  target_type?: string | null;
  target_id?: string | null;
  metadata_json?: import("@/lib/supabase/types").Json | null;
  ip_address_hash?: string | null;
};

export async function writeAuditLog(
  supabase: SupabaseClient<Database>,
  entry: AuditEntry
) {
  const { error } = await supabase.from("audit_logs").insert(entry);
  if (error) {
    console.error("[audit]", error.message, entry.action);
  }
}
