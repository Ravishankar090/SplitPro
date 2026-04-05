"use client";
export const dynamic = "force-dynamic";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function VerifyPage() {
  const router = useRouter();
  const supabase = createClient();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const phone = typeof window !== "undefined"
    ? sessionStorage.getItem("fk_phone") ?? ""
    : "";

  function handleChange(i: number, v: string) {
    const d = v.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[i] = d;
    setCode(next);
    if (d && i < 5) inputs.current[i + 1]?.focus();
  }

  function handleKey(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !code[i] && i > 0) {
      const next = [...code];
      next[i - 1] = "";
      setCode(next);
      inputs.current[i - 1]?.focus();
    }
  }

  async function verify() {
    const token = code.join("");
    if (token.length < 6) return;
    setLoading(true);
    setError("");
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: "sms",
      });
      if (error) throw error;
      router.push("/");
    } catch (e: any) {
      setError("Incorrect code. Please try again.");
      setCode(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  const displayPhone = phone.replace("+1", "");
  const fmt = `(${displayPhone.slice(0,3)}) ${displayPhone.slice(3,6)}-${displayPhone.slice(6)}`;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column",
      justifyContent: "center", padding: "0 28px" }}>

      <button onClick={() => router.back()}
        style={{ background: "none", border: "none", cursor: "pointer",
          color: "var(--c-muted)", fontSize: 22, padding: "0 0 28px",
          alignSelf: "flex-start" }}>←</button>

      <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--c-text)",
        letterSpacing: "-0.8px", marginBottom: 8 }}>Check your phone</h1>
      <p style={{ fontSize: 14, color: "var(--c-muted)", marginBottom: 40, lineHeight: 1.6 }}>
        We sent a 6-digit code to<br />
        <strong style={{ color: "var(--c-text)" }}>+1 {fmt}</strong>
      </p>

      {/* OTP boxes */}
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 24 }}>
        {code.map((v, i) => (
          <input
            key={i}
            ref={el => { inputs.current[i] = el; }}
            value={v}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKey(i, e)}
            maxLength={1}
            inputMode="numeric"
            style={{
              width: 46, height: 56, textAlign: "center", fontSize: 24,
              fontWeight: 700, fontFamily: "monospace",
              border: `2px solid ${v ? "var(--c-primary)" : "var(--c-border)"}`,
              borderRadius: 12, background: "var(--c-surface)",
              color: "var(--c-text)", outline: "none",
              transition: "border-color 0.15s",
            }}
          />
        ))}
      </div>

      {error && (
        <p style={{ textAlign: "center", fontSize: 13,
          color: "var(--c-accent)", marginBottom: 16 }}>{error}</p>
      )}

      <button
        className="btn-primary"
        onClick={verify}
        disabled={code.join("").length < 6 || loading}
      >
        {loading ? "Verifying…" : "Verify"}
      </button>

      <button
        style={{ background: "none", border: "none", color: "var(--c-muted)",
          fontSize: 13, cursor: "pointer", marginTop: 16,
          fontFamily: "inherit", padding: "8px" }}
        onClick={async () => {
          await supabase.auth.signInWithOtp({ phone });
        }}
      >
        Resend code
      </button>
    </div>
  );
}
