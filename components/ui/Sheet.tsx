"use client";

import { useEffect } from "react";

interface SheetProps {
  onClose: () => void;
  children: React.ReactNode;
}

export function Sheet({ onClose, children }: SheetProps) {
  // Close on backdrop tap, prevent scroll behind
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      className="sheet-backdrop"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="sheet" style={{ padding: "20px 20px 32px" }}>
        {/* Drag handle */}
        <div style={{ width: 36, height: 4, background: "var(--c-border)",
          borderRadius: 2, margin: "0 auto 18px" }} />
        {children}
      </div>
    </div>
  );
}
