"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const COLORS = ["#1E3A1E","#C45C1A","#1A4A7C","#7C1A6B","#1A6B5C","#6B1A3A","#7C6B1A"];

export default function OnboardPage() {
  const router   = useRouter();
  const supabase = createClient();
  const [step,      setStep]      = useState<"name"|"group">("name");
  const [name,      setName]      = useState("");
  const [color,     setColor]     = useState(COLORS[0]);
  const [mode,      setMode]      = useState<"create"|"join">("create");
  const [groupName, setGroupName] = useState("");
  const [code,      setCode]      = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  async function finish() {
    setLoading(true); setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let groupId: string;
      if (mode === "create") {
        const gName = groupName.trim() || `${name}&apos;s Family`;
        const { data, error: gErr } = await supabase
          .from("groups")
          .insert({ name: gName } as any)
          .select("id")
          .single();
        if (gErr || !data) throw gErr ?? new Error("Failed to create group");
        groupId = (data as any).id;
      } else {
        const { data, error: gErr } = await supabase
          .from("groups")
          .select("id")
          .eq("invite_code", code.toUpperCase().trim())
          .single();
        if (gErr || !data) throw new Error("Invalid invite code — double check it");
        groupId = (data as any).id;
      }

      const { error: pErr } = await supabase
        .from("profiles")
        .update({ name: name.trim(), group_id: groupId, avatar_color: color } as any)
        .eq("id", user.id);
      if (pErr) throw pErr;

      router.push("/bills");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally { setLoading(false); }
  }

  if (step === "name") return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center", padding:"0 28px" }}>
      <h1 style={{ fontSize:28, fontWeight:700, color:"var(--c-text)", letterSpacing:"-0.8px", marginBottom:8 }}>
        What&apos;s your name?
      </h1>
      <p style={{ fontSize:14, color:"var(--c-muted)", marginBottom:36, lineHeight:1.6 }}>
        This is how your family members will see you.
      </p>
      <p className="section-label" style={{ marginBottom:8 }}>Your name</p>
      <input className="input" value={name} onChange={e=>setName(e.target.value)}
        placeholder="e.g. Alex" autoFocus style={{ marginBottom:24 }}/>
      <p className="section-label" style={{ marginBottom:10 }}>Pick a colour</p>
      <div style={{ display:"flex", gap:10, marginBottom:36 }}>
        {COLORS.map(c=>(
          <button key={c} onClick={()=>setColor(c)} style={{
            width:40, height:40, borderRadius:"50%", background:c, cursor:"pointer",
            border: color===c ? "3px solid var(--c-text)" : "3px solid transparent",
          }}/>
        ))}
      </div>
      <button className="btn-primary" onClick={()=>setStep("group")} disabled={!name.trim()}>
        Continue
      </button>
    </div>
  );

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center", padding:"0 28px" }}>
      <button onClick={()=>setStep("name")} style={{ background:"none", border:"none",
        cursor:"pointer", color:"var(--c-muted)", fontSize:22,
        padding:"0 0 28px", alignSelf:"flex-start" }}>←</button>
      <h1 style={{ fontSize:28, fontWeight:700, color:"var(--c-text)", letterSpacing:"-0.8px", marginBottom:8 }}>
        Your family group
      </h1>
      <p style={{ fontSize:14, color:"var(--c-muted)", marginBottom:36, lineHeight:1.5 }}>
        Create a new group or join one your family set up.
      </p>

      <div style={{ display:"flex", background:"var(--c-surface)", borderRadius:12, padding:3, marginBottom:24 }}>
        {(["create","join"] as const).map(m=>(
          <button key={m} onClick={()=>setMode(m)} style={{
            flex:1, padding:"8px", borderRadius:9, fontSize:13, fontWeight:600,
            cursor:"pointer", fontFamily:"inherit", border:"none",
            background: mode===m?"var(--c-primary)":"transparent",
            color: mode===m?"#fff":"var(--c-muted)",
          }}>{m==="create"?"Create group":"Join with code"}</button>
        ))}
      </div>

      {mode==="create" ? (
        <>
          <p className="section-label" style={{ marginBottom:8 }}>Group name</p>
          <input className="input" value={groupName} onChange={e=>setGroupName(e.target.value)}
            placeholder={`${name}'s Family`} style={{ marginBottom:24 }}/>
        </>
      ) : (
        <>
          <p className="section-label" style={{ marginBottom:8 }}>Invite code</p>
          <input className="input" value={code} onChange={e=>setCode(e.target.value.toUpperCase())}
            placeholder="e.g. A1B2C3D4" maxLength={8}
            style={{ marginBottom:8, letterSpacing:"0.2em", fontWeight:700 }}/>
          <p style={{ fontSize:12, color:"var(--c-muted)", marginBottom:24 }}>
            Ask a family member for the code from their Profile tab.
          </p>
        </>
      )}

      {error&&<p style={{ fontSize:13, color:"var(--c-accent)", marginBottom:12 }}>{error}</p>}
      <button className="btn-primary" onClick={finish}
        disabled={loading || (mode==="join" && code.length<6)}>
        {loading ? "Setting up…" : mode==="create" ? "Create group" : "Join group"}
      </button>
    </div>
  );
}
