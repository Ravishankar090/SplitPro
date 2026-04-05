"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [mode,     setMode]     = useState<"signin"|"signup">("signin");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  async function submit() {
    setLoading(true);
    setError("");
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      router.push("/");
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column",
      justifyContent:"center", padding:"0 28px" }}>

      <div style={{ textAlign:"center", marginBottom:48 }}>
        <div style={{ width:72, height:72, borderRadius:22,
          background:"var(--c-primary)", display:"inline-flex",
          alignItems:"center", justifyContent:"center",
          fontSize:36, marginBottom:16 }}>💸</div>
        <div style={{ fontSize:32, fontWeight:700, color:"var(--c-text)",
          letterSpacing:"-1px" }}>FamKit</div>
        <div style={{ fontSize:14, color:"var(--c-muted)", marginTop:4 }}>
          Bills &amp; shopping, together
        </div>
      </div>

      <div style={{ display:"flex", background:"var(--c-surface)",
        borderRadius:12, padding:3, marginBottom:24 }}>
        {(["signin","signup"] as const).map(m=>(
          <button key={m} onClick={()=>setMode(m)} style={{
            flex:1, padding:"8px", borderRadius:9, fontSize:13,
            fontWeight:600, cursor:"pointer", fontFamily:"inherit", border:"none",
            background: mode===m?"var(--c-primary)":"transparent",
            color: mode===m?"#fff":"var(--c-muted)",
          }}>{m==="signin"?"Sign in":"Create account"}</button>
        ))}
      </div>

      <p style={{ fontSize:11, fontWeight:600, color:"var(--c-muted)",
        letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>
        Email
      </p>
      <input className="input" type="email" value={email}
        onChange={e=>setEmail(e.target.value)}
        placeholder="you@example.com"
        style={{ marginBottom:12 }}/>

      <p style={{ fontSize:11, fontWeight:600, color:"var(--c-muted)",
        letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>
        Password
      </p>
      <input className="input" type="password" value={password}
        onChange={e=>setPassword(e.target.value)}
        placeholder="••••••••"
        style={{ marginBottom:12 }}/>

      {error && (
        <p style={{ fontSize:13, color:"var(--c-accent)", marginBottom:12 }}>{error}</p>
      )}

      <button className="btn-primary" onClick={submit}
        disabled={!email||!password||loading}>
        {loading?"Please wait…":mode==="signin"?"Sign in":"Create account"}
      </button>

      <p style={{ textAlign:"center", fontSize:12, color:"var(--c-muted)",
        marginTop:24, lineHeight:1.6 }}>
        {mode==="signin"
          ? "New here? Switch to Create account above."
          : "Already have an account? Switch to Sign in above."}
      </p>
    </div>
  );
}
