"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types/database";

export function useMembers(groupId: string | null | undefined) {
  const supabase = createClient();
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) { setLoading(false); return; }
    supabase.from("profiles").select("*").eq("group_id", groupId).order("name")
      .then(({ data }) => { if (data) setMembers(data as Profile[]); setLoading(false); });
  }, [groupId]);

  return { members, loading };
}
