"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function fmtPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0,3)}) ${d.slice(3)}`;
  return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const digits = phone.replace(/\D/g, "");

  async function sendOTP() {
    if (digits.length < 10) return;
    setLoading(true);
    setError("");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: `+1${digits}`,
      });
      if (error) throw error;
      sessionStorage.setItem("fk_phone", `+1${digits}`);
      router.push("/verify");
    } catch (e: any) {
      setError(e.message || "Failed to send code");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column",
      justifyContent: "center", padding: "0 28px" }}>

      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{ width: 72, height: 72, borderRadius: 22,
          background: "var(--c-primary)", display: "inline-flex",
          alignItems: "center", justifyContent: "center",
          fontSize: 36, marginBottom: 16 }}>💸</div>
        <div style={{ fontSize: 32, fontWeight: 700, color: "var(--c-text)",
          letterSpacing: "-1px" }}>FamKit</div>
        <div style={{ fontSize: 14, color: "var(--c-muted)", marginTop: 4 }}>
          Bills & shopping, together
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <p className="section-label" style={{ marginBottom: 8 }}>Mobile number</p>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ background: "var(--c-surface)",
            border: "1.5px solid var(--c-border)", borderRadius: 12,
            padding: "11px 14px", fontSize: 15, fontWeight: 600,
            color: "var(--c-text)", flexShrink: 0 }}>+1</div>
          <input
            className="input"
            value={fmtPhone(phone)}
            onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="(555) 000-0000"
            inputMode="tel"
            autoComplete="tel"
            style={{ flex: 1 }}
          />
        </div>
      </div>

      {error && (
        <p style={{ fontSize: 13, color: "var(--c-accent)", marginBottom: 12 }}>{error}</p>
      )}

      <button
        className="btn-primary"
        onClick={sendOTP}
        disabled={digits.length < 10 || loading}
      >
        {loading ? "Sending…" : "Send verification code"}
      </button>

      <p style={{ textAlign: "center", fontSize: 12, color: "var(--c-muted)",
        marginTop: 24, lineHeight: 1.6 }}>
        We&apos;ll text you a one-time code. Standard rates apply.
      </p>
    </div>
  );
}
