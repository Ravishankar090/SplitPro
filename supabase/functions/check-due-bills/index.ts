// supabase/functions/check-due-bills/index.ts
// Deploy: supabase functions deploy check-due-bills
// Schedule: every day at 09:00 via Supabase cron
//   select cron.schedule('check-due-bills', '0 9 * * *', $$select net.http_post(...)$$)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async () => {
  const today = new Date().toISOString().split("T")[0];

  // Find recurring bills due today or overdue
  const { data: dueBills, error } = await supabase
    .from("bills")
    .select(`
      id, title, group_id, recurring_next_due,
      bill_splits ( user_id, amount, is_payer )
    `)
    .eq("is_recurring", true)
    .eq("recurring_status", "upcoming")
    .lte("recurring_next_due", today);

  if (error) return new Response(JSON.stringify({ error }), { status: 500 });

  for (const bill of dueBills ?? []) {
    // Mark as due
    await supabase
      .from("bills")
      .update({ recurring_status: "due" })
      .eq("id", bill.id);

    // Get all group member push subscriptions and notify
    // (Web Push implementation would go here using a push service)
    // For now, log it
    console.log(`Bill due: ${bill.title} for group ${bill.group_id}`);
  }

  return new Response(
    JSON.stringify({ processed: dueBills?.length ?? 0 }),
    { headers: { "Content-Type": "application/json" } }
  );
});
