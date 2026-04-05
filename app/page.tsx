import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function RootPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("profiles")
    .select("name, group_id")
    .eq("id", user.id)
    .single();

  const profile = data as { name: string; group_id: string | null } | null;
  if (!profile?.name) redirect("/onboard");
  redirect("/bills");
}
// force dynamic — requires Supabase env vars at runtime
export const dynamic = "force-dynamic";
