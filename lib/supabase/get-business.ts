import type { SupabaseClient } from "@supabase/supabase-js";
import type { Business } from "@/lib/types/database";

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
