import type { SupabaseClient } from "@supabase/supabase-js";
import type { Business } from "@/lib/types/database";

// Shared helper used by the dashboard, inventory, receipts, and reports
// pages/actions. Each logged-in user owns exactly one business (created for
// them automatically at signup — see app/actions/auth.ts), so this answers
// the one question almost every feature needs answered first: "which
// business does this data belong to?"

/**
 * Looks up the business belonging to the currently logged-in user.
 *
 * Returns `null` if nobody's logged in, or (in theory) if a logged-in
 * user somehow has no business row — callers should treat that as an
 * error state, not silently continue.
 *
 * We always derive the business from the session (never from a value the
 * client sent us) — that's what makes it safe to trust when filtering
 * database queries by business_id.
 */
export async function getCurrentBusiness(
  supabase: SupabaseClient
): Promise<Pick<Business, "id" | "name"> | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("user_id", user.id)
    .maybeSingle();

  return business;
}
