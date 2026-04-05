"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { FullPageSpinner } from "@/components/ui/Spinner";
import type { Profile, Group } from "@/lib/types/database";

const COLORS = ["#1E3A1E","#C45C1A","#1A4A7C","#7C1A6B","#1A6B5C","#6B1A3A","#7C6B1A"];

export default function ProfilePage() {
  const { profile, loading, signOut } = useCurrentUser();
  const supabase = createClient();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setName(profile.name);
    setColor(profile.avatar_color);

    if (profile.group_id) {
      supabase.from("groups").select("*").eq("id", profile.group_id).single()
        .then(({ data }) => { if (data) setGroup(data); });
      supabase.from("profiles").select("*").eq("group_id", profile.group_id)
        .then(({ data }) => { if (data) setMembers(data); });
    }
  }, [profile?.id]);

  async function save() {
    if (!profile) return;
    setSaving(true);
    await supabase.from("profiles").update({ name, avatar_color: color } as any).eq("id", profile.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading || !profile) return <FullPageSpinner />;

  const row = (label: string, value: string) => (
    <div style={{ display: "flex", justifyContent: "space-between",
      alignItems: "center", padding: "12px 0",
      borderBottom: "1px solid var(--c-border)" }}>
      <span style={{ fontSize: 13, color: "var(--c-muted)" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)" }}>{value}</span>
    </div>
  );

  return (
    <div style={{ padding: "16px 20px 120px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--c-text)",
        letterSpacing: "-0.8px", marginBottom: 24 }}>Profile</h1>

      {/* Avatar preview */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
        <Avatar name={name || profile.name} color={color} size={80} />
      </div>

      {/* Name */}
      <p className="section-label" style={{ marginBottom: 8 }}>Your name</p>
      <input className="input" value={name} onChange={e => setName(e.target.value)}
        style={{ marginBottom: 16 }} />

      {/* Colour */}
      <p className="section-label" style={{ marginBottom: 10 }}>Colour</p>
      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        {COLORS.map(c => (
          <button key={c} onClick={() => setColor(c)} style={{
            width: 36, height: 36, borderRadius: "50%", background: c,
            border: color === c ? "3px solid var(--c-text)" : "3px solid transparent",
            cursor: "pointer", transition: "border 0.15s",
          }} />
        ))}
      </div>

      <button className="btn-primary" onClick={save}
        disabled={saving || (name === profile.name && color === profile.avatar_color)}>
        {saving ? "Saving…" : saved ? "✓ Saved" : "Save changes"}
      </button>

      {/* Account info */}
      <div style={{ marginTop: 28, marginBottom: 20 }}>
        <p className="section-label" style={{ marginBottom: 4 }}>Account</p>
        <div style={{ background: "var(--c-surface)", borderRadius: 14,
          padding: "0 14px" }}>
          {row("Phone", profile.phone ?? "—")}
          {row("Member since", new Date(profile.created_at).toLocaleDateString("en-US", {
            month: "long", year: "numeric",
          }))}
        </div>
      </div>

      {/* Family group */}
      {group && (
        <div style={{ marginBottom: 20 }}>
          <p className="section-label" style={{ marginBottom: 4 }}>Family group</p>
          <div style={{ background: "var(--c-surface)", borderRadius: 14, padding: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between",
              marginBottom: 14 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--c-text)" }}>
                {group.name}
              </span>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "var(--c-muted)", marginBottom: 2 }}>
                  Invite code
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.15em",
                  color: "var(--c-primary)", fontFamily: "monospace" }}>
                  {group.invite_code}
                </div>
              </div>
            </div>
            <p style={{ fontSize: 12, color: "var(--c-muted)", margin: "0 0 14px" }}>
              Share this code with family members so they can join.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {members.map(m => (
                <div key={m.id} style={{ display: "flex", alignItems: "center",
                  gap: 7, padding: "6px 10px", borderRadius: 20,
                  background: "var(--c-tag)" }}>
                  <Avatar name={m.name} color={m.avatar_color} size={22} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--c-text)" }}>
                    {m.name}{m.id === profile.id ? " (you)" : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sign out */}
      <button onClick={signOut} style={{
        width: "100%", background: "none",
        border: "1.5px solid var(--c-border)", borderRadius: 14,
        padding: "13px", fontSize: 14, fontWeight: 600,
        color: "var(--c-accent)", cursor: "pointer", fontFamily: "inherit",
      }}>
        Sign out
      </button>
    </div>
  );
}
