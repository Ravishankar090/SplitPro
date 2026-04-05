"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BillWithSplits, PersonBalance } from "@/lib/types/database";

export function useBills(userId: string, groupId: string) {
  const supabase = createClient();
  const [bills,   setBills]   = useState<BillWithSplits[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBills = useCallback(async () => {
    if (!groupId) return;
    const { data } = await supabase
      .from("bills")
      .select(`
        *,
        payer:profiles!bills_paid_by_fkey ( id, name, avatar_color ),
        splits:bill_splits (
          *,
          profile:profiles!bill_splits_user_id_fkey ( id, name, avatar_color )
        ),
        history:bill_history ( * )
      `)
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });
    if (data) setBills(data as unknown as BillWithSplits[]);
  }, [groupId]);

  useEffect(() => {
    fetchBills().finally(() => setLoading(false));
    const ch = supabase
      .channel("bill_splits_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "bill_splits" }, fetchBills)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchBills]);

  /* ── per-person balance aggregation ── */
  const balances: Record<string, PersonBalance> = {};
  bills.forEach(bill => {
    const myS = bill.splits?.find(s => s.user_id === userId);
    if (!myS) return;
    bill.splits?.forEach(sp => {
      if (sp.user_id === userId) return;
      if (!balances[sp.user_id]) {
        balances[sp.user_id] = { person: sp.profile, net: 0, owedToMe: 0, iOwe: 0, items: [] };
      }
      if (myS.is_payer && !sp.settled && !sp.is_payer) {
        balances[sp.user_id].net += sp.amount;
        balances[sp.user_id].owedToMe += sp.amount;
        balances[sp.user_id].items.push({ bill, dir: "owes_me", amt: sp.amount });
      } else if (sp.is_payer && !myS.settled && !myS.is_payer) {
        balances[sp.user_id].net -= myS.amount;
        balances[sp.user_id].iOwe += myS.amount;
        balances[sp.user_id].items.push({ bill, dir: "i_owe", amt: myS.amount });
      }
    });
  });

  /* ── mutations ── */
  async function createBill(p: {
    title: string; amount: number; paidBy: string;
    participants: string[]; isRecurring: boolean; recurringFreq?: string;
  }) {
    const perP    = p.amount / p.participants.length;
    const nextDue = p.isRecurring
      ? new Date(Date.now() + freqMs(p.recurringFreq!)).toISOString().split("T")[0]
      : null;
    const { data: b } = await (supabase as any).from("bills").insert({
      group_id: groupId, title: p.title, amount: p.amount, paid_by: p.paidBy,
      is_recurring: p.isRecurring, recurring_freq: p.recurringFreq ?? null,
      recurring_next_due: nextDue, recurring_status: "upcoming", created_by: userId,
    }).select("id").single();
    if (!b) return;
    await (supabase as any).from("bill_splits").insert(
      p.participants.map((pid: string) => ({
        bill_id: b.id, user_id: pid,
        amount: parseFloat(perP.toFixed(2)),
        is_payer: pid === p.paidBy, settled: pid === p.paidBy,
      }))
    );
    await fetchBills();
  }

  async function settlePerson(personId: string) {
    const now  = new Date().toISOString();
    const ups: Promise<unknown>[] = [];
    bills.forEach(bill => {
      const myS    = bill.splits?.find(s => s.user_id === userId);
      const theirS = bill.splits?.find(s => s.user_id === personId);
      if (!myS || !theirS) return;
      if (myS.is_payer && !theirS.settled && !theirS.is_payer)
        ups.push((supabase as any).from("bill_splits").update({ settled: true, settled_at: now }).eq("id", theirS.id));
      else if (theirS.is_payer && !myS.settled && !myS.is_payer)
        ups.push((supabase as any).from("bill_splits").update({ settled: true, settled_at: now }).eq("id", myS.id));
    });
    await Promise.all(ups);
    await fetchBills();
  }

  async function markRecurringPaid(billId: string) {
    const bill = bills.find(b => b.id === billId);
    if (!bill?.is_recurring) return;
    const nextDue = new Date(Date.now() + freqMs(bill.recurring_freq!)).toISOString().split("T")[0];
    const now     = new Date().toISOString();
    await (supabase as any).from("bill_splits").update({ settled: true, settled_at: now }).eq("bill_id", billId);
    await (supabase as any).from("bills").update({ recurring_status: "upcoming", recurring_next_due: nextDue }).eq("id", billId);
    const month = new Date().toLocaleString("default", { month: "short", year: "numeric" });
    await (supabase as any).from("bill_history").insert({
      bill_id: billId, month, amount: bill.amount, paid: true, paid_by: bill.paid_by,
    });
    await fetchBills();
  }

  async function skipRecurring(billId: string) {
    const bill = bills.find(b => b.id === billId);
    if (!bill?.recurring_freq) return;
    const nextDue = new Date(Date.now() + freqMs(bill.recurring_freq)).toISOString().split("T")[0];
    await (supabase as any).from("bills").update({ recurring_status: "upcoming", recurring_next_due: nextDue }).eq("id", billId);
    await fetchBills();
  }

  async function updateRecurringBill(billId: string, u: {
    title?: string; amount?: number; paidBy?: string; freq?: string; participants?: string[];
  }) {
    const bill = bills.find(b => b.id === billId);
    if (!bill) return;
    const patch: Record<string, unknown> = {};
    if (u.title)  patch.title           = u.title;
    if (u.amount) patch.amount          = u.amount;
    if (u.paidBy) patch.paid_by         = u.paidBy;
    if (u.freq)   patch.recurring_freq  = u.freq;
    await (supabase as any).from("bills").update(patch).eq("id", billId);

    if (u.participants || u.amount || u.paidBy) {
      const parts = u.participants ?? bill.splits.map(s => s.user_id);
      const amt   = u.amount ?? bill.amount;
      const payer = u.paidBy ?? bill.paid_by;
      const perP  = amt / parts.length;
      await (supabase as any).from("bill_splits").delete().eq("bill_id", billId);
      await (supabase as any).from("bill_splits").insert(
        parts.map((pid: string) => ({
          bill_id: billId, user_id: pid,
          amount: parseFloat(perP.toFixed(2)),
          is_payer: pid === payer, settled: pid === payer,
        }))
      );
      if (u.amount && u.amount !== bill.amount) {
        const month = new Date().toLocaleString("default", { month: "short", year: "numeric" });
        await (supabase as any).from("bill_history").insert({
          bill_id: billId, month: `${month} (updated)`,
          amount: u.amount, paid: false, paid_by: payer,
          note: `Updated from $${bill.amount.toFixed(2)}`,
        });
      }
    }
    await fetchBills();
  }

  return {
    bills, balances, loading, refetch: fetchBills,
    createBill, settlePerson, markRecurringPaid, skipRecurring, updateRecurringBill,
  };
}

function freqMs(freq: string) {
  const d = 86_400_000;
  return freq === "weekly" ? 7*d : freq === "monthly" ? 30*d : freq === "quarterly" ? 91*d : 365*d;
}
