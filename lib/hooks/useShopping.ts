"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ShoppingItem } from "@/lib/types/database";

export function useShopping(groupId: string) {
  const supabase = createClient();
  const [items,   setItems]   = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    if (!groupId) return;
    const { data } = await supabase
      .from("shopping_items")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true });
    if (data) setItems(data as ShoppingItem[]);
  }, [groupId]);

  useEffect(() => {
    fetchItems().finally(() => setLoading(false));

    // Real-time: list updates instantly for all family members
    const ch = supabase
      .channel(`shopping_${groupId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "shopping_items",
        filter: `group_id=eq.${groupId}`,
      }, payload => {
        if (payload.eventType === "INSERT")
          setItems(p => [...p, payload.new as ShoppingItem]);
        else if (payload.eventType === "UPDATE")
          setItems(p => p.map(i => i.id === payload.new.id ? payload.new as ShoppingItem : i));
        else if (payload.eventType === "DELETE")
          setItems(p => p.filter(i => i.id !== payload.old.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [fetchItems, groupId]);

  async function addItem(item: {
    name: string; qty: number; unit: string; store: string; requestedBy: string;
  }) {
    await (supabase as any).from("shopping_items").insert({
      group_id: groupId, name: item.name, qty: item.qty, unit: item.unit,
      store: item.store, requested_by: item.requestedBy, status: "pending",
    });
  }

  async function removeItem(id: string) {
    await supabase.from("shopping_items").delete().eq("id", id);
  }

  async function markBought(ids: string[], boughtBy: string) {
    await (supabase as any).from("shopping_items")
      .update({ status: "done", bought_by: boughtBy })
      .in("id", ids);
  }

  async function clearDone() {
    await supabase.from("shopping_items")
      .delete()
      .eq("group_id", groupId)
      .eq("status", "done");
  }

  const byStore = items
    .filter(i => i.status === "pending")
    .reduce<Record<string, ShoppingItem[]>>((acc, item) => {
      if (!acc[item.store]) acc[item.store] = [];
      acc[item.store].push(item);
      return acc;
    }, {});

  return { items, byStore, loading, addItem, removeItem, markBought, clearDone };
}
