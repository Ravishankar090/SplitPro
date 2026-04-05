"use client";

import { useState, useRef } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Avatar } from "@/components/ui/Avatar";
import { Spinner } from "@/components/ui/Spinner";
import type { Profile, ScanResult } from "@/lib/types/database";

const FREQS = [
  { id: "weekly", label: "Weekly" }, { id: "monthly", label: "Monthly" },
  { id: "quarterly", label: "Quarterly" }, { id: "yearly", label: "Yearly" },
];

type SplitMode = "equal" | "custom" | "items-assign" | "items-shared";

interface ScannedItem {
  id: number;
  name: string;
  qty: number;
  price: number;
  assignee: string | null;            // for items-assign
  sharers: string[];                   // for items-shared
}

interface CreateBillPayload {
  title: string;
  amount: number;
  paidBy: string;
  participants: string[];
  isRecurring: boolean;
  recurringFreq?: string;
}

interface Props {
  members: Profile[];
  currentUserId: string;
  onClose: () => void;
  onCreate: (payload: CreateBillPayload) => Promise<void>;
}

/* ── small helpers ── */
function PersonPills({ members, selected, multi, onToggle }: {
  members: Profile[];
  selected: string | string[];
  multi?: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {members.map(m => {
        const on = multi
          ? (selected as string[]).includes(m.id)
          : selected === m.id;
        return (
          <button key={m.id} onClick={() => onToggle(m.id)} style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "7px 13px", borderRadius: 20, cursor: "pointer",
            fontFamily: "inherit", fontWeight: 600, fontSize: 13,
            border: on ? "none" : "1.5px solid var(--c-border)",
            background: on ? m.avatar_color : "transparent",
            color: on ? "#fff" : "var(--c-text)", transition: "all 0.12s",
          }}>
            <Avatar name={m.name} color={m.avatar_color} size={18} />
            {m.name}
          </button>
        );
      })}
    </div>
  );
}

/* ── Mode selector ── */
function ModeCard({ id, icon, title, desc, active, onClick }: {
  id: string; icon: string; title: string; desc: string;
  active: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{
      width: "100%", display: "flex", alignItems: "center", gap: 12,
      background: active ? "var(--c-primary)" : "var(--c-surface)",
      border: active ? "none" : "1.5px solid var(--c-border)",
      borderRadius: 14, padding: "12px 14px", marginBottom: 8,
      cursor: "pointer", textAlign: "left", fontFamily: "inherit",
      transition: "all 0.15s",
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 20, background: active ? "rgba(255,255,255,0.15)" : "var(--c-tag)",
      }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600,
          color: active ? "#fff" : "var(--c-text)" }}>{title}</div>
        <div style={{ fontSize: 12, marginTop: 2,
          color: active ? "rgba(255,255,255,0.65)" : "var(--c-muted)" }}>{desc}</div>
      </div>
    </button>
  );
}

export function CreateBillSheet({ members, currentUserId, onClose, onCreate }: Props) {
  const [step, setStep] = useState<"mode" | "form">("mode");
  const [mode, setMode] = useState<SplitMode>("equal");

  // Common fields
  const [title, setTitle]   = useState("");
  const [amount, setAmount] = useState("");
  const [payer,  setPayer]  = useState(currentUserId);
  const [participants, setParticipants] = useState<string[]>(members.map(m => m.id));
  const [isRecurring, setIsRecurring]   = useState(false);
  const [freq,        setFreq]          = useState("monthly");
  const [loading, setLoading] = useState(false);

  // Custom split
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});

  // Items modes
  const [items, setItems] = useState<ScannedItem[]>([]);
  const [newItemName,  setNewItemName]  = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const toggleParticipant = (id: string) =>
    setParticipants(p => p.includes(id) ? (p.length > 1 ? p.filter(x => x !== id) : p) : [...p, id]);

  const amt = parseFloat(amount) || 0;

  // ── Derived totals ──
  const allocatedCustom = participants.reduce((s, id) => s + (parseFloat(customAmounts[id] || "0") || 0), 0);
  const balanceLeft = amt - allocatedCustom;

  const itemsTotal = items.reduce((s, i) => s + i.price, 0);

  function perPersonForItem(item: ScannedItem): number {
    if (mode === "items-assign") return item.price;
    return item.sharers.length > 0 ? item.price / item.sharers.length : item.price;
  }

  // ── Validation ──
  const isValid = (() => {
    if (!title.trim()) return false;
    if (mode === "equal") return amt > 0 && participants.length > 0;
    if (mode === "custom") return amt > 0 && Math.abs(balanceLeft) < 0.02;
    if (mode === "items-assign") return items.length > 0 && items.every(i => i.assignee);
    if (mode === "items-shared") return items.length > 0;
    return false;
  })();

  // ── Receipt scan ──
  async function handleScan(file: File) {
    setScanning(true);
    setScanError("");
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/scan-receipt", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Scan failed");
      const result: ScanResult = await res.json();
      setItems(result.items.map((item, i) => ({
        id: i + 1,
        name: item.name,
        qty: item.qty,
        price: item.price,
        assignee: null,
        sharers: members.map(m => m.id),
      })));
      if (result.merchant && !title) setTitle(result.merchant);
      if (result.total && !amount) setAmount(result.total.toFixed(2));
    } catch {
      setScanError("Could not read the receipt. Try a clearer photo.");
    } finally {
      setScanning(false);
    }
  }

  function addManualItem() {
    if (!newItemName.trim() || !newItemPrice) return;
    setItems(prev => [...prev, {
      id: Date.now(),
      name: newItemName.trim(),
      qty: 1,
      price: parseFloat(newItemPrice),
      assignee: null,
      sharers: members.map(m => m.id),
    }]);
    setNewItemName(""); setNewItemPrice("");
  }

  function removeItem(id: number) { setItems(prev => prev.filter(i => i.id !== id)); }

  function assignItem(itemId: number, userId: string) {
    setItems(prev => prev.map(i => i.id === itemId
      ? { ...i, assignee: i.assignee === userId ? null : userId } : i));
  }

  function toggleSharer(itemId: number, userId: string) {
    setItems(prev => prev.map(i => {
      if (i.id !== itemId) return i;
      const has = i.sharers.includes(userId);
      if (has && i.sharers.length === 1) return i;
      return { ...i, sharers: has ? i.sharers.filter(x => x !== userId) : [...i.sharers, userId] };
    }));
  }

  // ── Submit ──
  async function submit() {
    if (!isValid) return;
    setLoading(true);
    try {
      let finalAmount = amt;
      let finalParticipants = participants;

      if (mode === "items-assign" || mode === "items-shared") {
        finalAmount = parseFloat(itemsTotal.toFixed(2));
        finalParticipants = [...new Set(
          mode === "items-assign"
            ? items.map(i => i.assignee!).filter(Boolean)
            : items.flatMap(i => i.sharers)
        )];
      }

      await onCreate({
        title,
        amount: finalAmount,
        paidBy: payer,
        participants: finalParticipants,
        isRecurring,
        recurringFreq: freq,
      });
      onClose();
    } finally { setLoading(false); }
  }

  // ── Mode selection screen ──
  if (step === "mode") return (
    <Sheet onClose={onClose}>
      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--c-text)", marginBottom: 18 }}>
        New bill — choose split type
      </div>
      {([
        { id: "equal",        icon: "⚖️", title: "Equal split",       desc: "Everyone pays the same" },
        { id: "custom",       icon: "🔢", title: "Custom amounts",     desc: "Set each person's exact share" },
        { id: "items-assign", icon: "🧾", title: "Assign receipt items", desc: "Each item goes to one person" },
        { id: "items-shared", icon: "🤝", title: "Shared receipt items", desc: "Items split among selected people" },
      ] as { id: SplitMode; icon: string; title: string; desc: string }[]).map(m => (
        <ModeCard key={m.id} {...m} active={mode === m.id} onClick={() => setMode(m.id)} />
      ))}
      <button className="btn-primary" style={{ marginTop: 8 }}
        onClick={() => setStep("form")}>Continue →</button>
    </Sheet>
  );

  // ── Form screen ──
  const needsItems = mode === "items-assign" || mode === "items-shared";

  return (
    <Sheet onClose={onClose}>
      {/* Header with back */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <button onClick={() => setStep("mode")} style={{
          background: "none", border: "none", cursor: "pointer",
          color: "var(--c-muted)", fontSize: 22, padding: 0, lineHeight: 1,
        }}>←</button>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--c-text)", flex: 1 }}>
          {mode === "equal" ? "Equal split"
            : mode === "custom" ? "Custom amounts"
            : mode === "items-assign" ? "Assign items"
            : "Shared items"}
        </div>
      </div>

      {/* Bill name */}
      <p className="section-label" style={{ marginBottom: 8 }}>Bill name</p>
      <input className="input" value={title} onChange={e => setTitle(e.target.value)}
        placeholder="e.g. Dinner, Netflix" autoFocus style={{ marginBottom: 14 }} />

      {/* Amount — only for equal/custom */}
      {!needsItems && (
        <>
          <p className="section-label" style={{ marginBottom: 8 }}>Total amount</p>
          <div style={{ position: "relative", marginBottom: 14 }}>
            <span style={{ position: "absolute", left: 14, top: "50%",
              transform: "translateY(-50%)", fontSize: 16,
              color: "var(--c-muted)", fontWeight: 600 }}>$</span>
            <input className="input" value={amount}
              onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="0.00" inputMode="decimal"
              style={{ paddingLeft: 28, fontSize: 24, fontWeight: 700 }} />
          </div>
        </>
      )}

      {/* Who paid */}
      <p className="section-label" style={{ marginBottom: 8 }}>Who paid upfront</p>
      <PersonPills members={members} selected={payer} onToggle={setPayer}  />
      <div style={{ height: 14 }} />

      {/* ── Equal split participants ── */}
      {mode === "equal" && (
        <>
          <p className="section-label" style={{ marginBottom: 8 }}>Split with</p>
          <PersonPills members={members} selected={participants} multi
            onToggle={toggleParticipant} />
          {amt > 0 && participants.length > 0 && (
            <p style={{ fontSize: 13, color: "var(--c-muted)", marginTop: 10 }}>
              ${(amt / participants.length).toFixed(2)} per person
            </p>
          )}
          <div style={{ height: 14 }} />
        </>
      )}

      {/* ── Custom amounts ── */}
      {mode === "custom" && (
        <>
          <p className="section-label" style={{ marginBottom: 8 }}>Each person&apos;s share</p>
          {/* Progress bar */}
          {amt > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ height: 7, background: "var(--c-border)",
                borderRadius: 4, overflow: "hidden", marginBottom: 6 }}>
                <div style={{
                  height: "100%", borderRadius: 4,
                  width: `${Math.min(100, (allocatedCustom / amt) * 100)}%`,
                  background: Math.abs(balanceLeft) < 0.02 ? "var(--c-green)"
                    : allocatedCustom > amt ? "var(--c-accent)" : "var(--c-primary)",
                  transition: "width 0.2s",
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--c-muted)" }}>
                  Allocated <strong style={{ color: "var(--c-text)" }}>
                    ${allocatedCustom.toFixed(2)}
                  </strong>
                </span>
                <span style={{ fontWeight: 600,
                  color: Math.abs(balanceLeft) < 0.02 ? "var(--c-green)"
                    : balanceLeft < 0 ? "var(--c-accent)" : "var(--c-muted)" }}>
                  {Math.abs(balanceLeft) < 0.02 ? "✓ Balanced"
                    : balanceLeft > 0 ? `$${balanceLeft.toFixed(2)} left`
                    : `$${Math.abs(balanceLeft).toFixed(2)} over`}
                </span>
              </div>
            </div>
          )}
          {members.map(m => (
            <div key={m.id} style={{
              display: "flex", alignItems: "center", gap: 10,
              background: "var(--c-surface)", borderRadius: 12,
              padding: "10px 12px", marginBottom: 8,
            }}>
              <Avatar name={m.name} color={m.avatar_color} size={34} />
              <div style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "var(--c-text)" }}>
                {m.name}
              </div>
              <div style={{ position: "relative", width: 96 }}>
                <span style={{ position: "absolute", left: 10, top: "50%",
                  transform: "translateY(-50%)", fontSize: 14,
                  color: "var(--c-muted)", fontWeight: 600 }}>$</span>
                <input value={customAmounts[m.id] ?? ""}
                  onChange={e => setCustomAmounts(prev => ({
                    ...prev, [m.id]: e.target.value.replace(/[^0-9.]/g, ""),
                  }))}
                  placeholder="0.00"
                  style={{
                    width: "100%", boxSizing: "border-box",
                    border: "1.5px solid var(--c-border)", borderRadius: 10,
                    padding: "8px 10px 8px 24px", fontSize: 15, fontWeight: 700,
                    background: "var(--c-surface)", color: "var(--c-text)",
                    outline: "none", fontFamily: "inherit",
                  }} />
              </div>
            </div>
          ))}
          <div style={{ height: 6 }} />
        </>
      )}

      {/* ── Receipt items (assign + shared) ── */}
      {needsItems && (
        <>
          {/* Scan / upload */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <input ref={fileRef} type="file" accept="image/*" capture="environment"
              style={{ display: "none" }}
              onChange={e => { if (e.target.files?.[0]) handleScan(e.target.files[0]); }} />
            <button onClick={() => fileRef.current?.click()}
              disabled={scanning}
              style={{
                flex: 1, background: "var(--c-surface)",
                border: "1.5px dashed var(--c-border)", borderRadius: 12,
                padding: "11px", fontSize: 13, fontWeight: 600,
                color: "var(--c-primary)", cursor: "pointer",
                fontFamily: "inherit", display: "flex",
                alignItems: "center", justifyContent: "center", gap: 8,
              }}>
              {scanning
                ? <><Spinner size={16} /> Scanning…</>
                : <>📷 Scan receipt</>}
            </button>
          </div>
          {scanError && (
            <p style={{ fontSize: 12, color: "var(--c-accent)", marginBottom: 10 }}>{scanError}</p>
          )}

          {/* Items list */}
          {items.length > 0 && (
            <>
              <p className="section-label" style={{ marginBottom: 10 }}>
                {mode === "items-assign" ? "Tap a name to assign each item"
                  : "Toggle who shares each item"}
              </p>
              {items.map(item => (
                <div key={item.id} style={{
                  background: "var(--c-surface)", borderRadius: 14,
                  padding: "11px 12px", marginBottom: 8,
                }}>
                  <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)" }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 2 }}>
                        qty {item.qty}
                      </div>
                    </div>
                    <div className="amount" style={{ fontSize: 13, fontWeight: 700,
                      color: "var(--c-text)", marginRight: 10 }}>
                      ${item.price.toFixed(2)}
                    </div>
                    <button onClick={() => removeItem(item.id)} style={{
                      background: "none", border: "none", color: "var(--c-muted)",
                      fontSize: 16, cursor: "pointer", padding: "0 2px", lineHeight: 1,
                    }}>×</button>
                  </div>

                  {mode === "items-assign" && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {members.map(m => {
                        const on = item.assignee === m.id;
                        return (
                          <button key={m.id} onClick={() => assignItem(item.id, m.id)} style={{
                            padding: "5px 11px", borderRadius: 8, fontSize: 12,
                            fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                            border: on ? "none" : "1.5px solid var(--c-border)",
                            background: on ? m.avatar_color : "transparent",
                            color: on ? "#fff" : "var(--c-text)", transition: "all 0.12s",
                          }}>{m.name}</button>
                        );
                      })}
                    </div>
                  )}

                  {mode === "items-shared" && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {members.map(m => {
                        const on = item.sharers.includes(m.id);
                        const perP = on ? item.price / item.sharers.length : 0;
                        return (
                          <button key={m.id} onClick={() => toggleSharer(item.id, m.id)}
                            style={{
                              display: "flex", flexDirection: "column",
                              alignItems: "center", gap: 3, padding: "6px 8px",
                              borderRadius: 10, border: "none", cursor: "pointer",
                              background: on ? m.avatar_color + "22" : "transparent",
                              fontFamily: "inherit",
                            }}>
                            <Avatar name={m.name} color={on ? m.avatar_color : "var(--c-border)"}
                              size={28} />
                            <span style={{ fontSize: 10, fontWeight: 700,
                              color: on ? m.avatar_color : "var(--c-muted)" }}>
                              {on ? `$${perP.toFixed(2)}` : "—"}
                            </span>
                          </button>
                        );
                      })}
                      <div style={{ marginLeft: "auto", textAlign: "right" }}>
                        <div style={{ fontSize: 10, color: "var(--c-muted)" }}>
                          {item.sharers.length} sharing
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--c-primary)" }}>
                          ÷${(item.price / Math.max(item.sharers.length, 1)).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          {/* Add item manually */}
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input value={newItemName} onChange={e => setNewItemName(e.target.value)}
              placeholder="Item name…"
              style={{ flex: 1, border: "1.5px solid var(--c-border)", borderRadius: 10,
                padding: "9px 12px", fontSize: 13, background: "var(--c-surface)",
                color: "var(--c-text)", outline: "none", fontFamily: "inherit" }} />
            <div style={{ position: "relative", width: 80 }}>
              <span style={{ position: "absolute", left: 8, top: "50%",
                transform: "translateY(-50%)", fontSize: 12, color: "var(--c-muted)" }}>$</span>
              <input value={newItemPrice}
                onChange={e => setNewItemPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="0.00"
                style={{ width: "100%", boxSizing: "border-box",
                  border: "1.5px solid var(--c-border)", borderRadius: 10,
                  padding: "9px 8px 9px 20px", fontSize: 13, fontWeight: 600,
                  background: "var(--c-surface)", color: "var(--c-text)",
                  outline: "none", fontFamily: "inherit" }} />
            </div>
            <button onClick={addManualItem} style={{
              background: "var(--c-primary)", border: "none", color: "#fff",
              borderRadius: 10, width: 38, flexShrink: 0, fontSize: 18,
              cursor: "pointer", display: "flex", alignItems: "center",
              justifyContent: "center",
            }}>+</button>
          </div>

          {/* Items total */}
          {items.length > 0 && (
            <div style={{
              background: "var(--c-surface)", borderRadius: 12,
              padding: "10px 14px", marginBottom: 8, display: "flex",
              justifyContent: "space-between", fontSize: 13,
            }}>
              <span style={{ color: "var(--c-muted)" }}>
                {items.length} item{items.length > 1 ? "s" : ""}
              </span>
              <span className="amount" style={{ fontWeight: 700, color: "var(--c-text)" }}>
                Total ${itemsTotal.toFixed(2)}
              </span>
            </div>
          )}
          <div style={{ height: 6 }} />
        </>
      )}

      {/* Recurring toggle */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12,
          marginBottom: isRecurring ? 14 : 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-text)" }}>
              Recurring bill
            </div>
            <div style={{ fontSize: 12, color: "var(--c-muted)", marginTop: 2 }}>
              Repeats on a schedule
            </div>
          </div>
          <button className="toggle-track"
            onClick={() => setIsRecurring(!isRecurring)}
            style={{ background: isRecurring ? "var(--c-primary)" : "var(--c-border)" }}>
            <div className="toggle-thumb" style={{ left: isRecurring ? 20 : 3 }} />
          </button>
        </div>
        {isRecurring && (
          <>
            <p className="section-label" style={{ marginBottom: 8 }}>Frequency</p>
            <div style={{ display: "flex", gap: 8 }}>
              {FREQS.map(f => (
                <button key={f.id} onClick={() => setFreq(f.id)} style={{
                  flex: 1, padding: "8px 4px", borderRadius: 10, fontSize: 12,
                  fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  border: freq === f.id ? "none" : "1.5px solid var(--c-border)",
                  background: freq === f.id ? "var(--c-primary)" : "transparent",
                  color: freq === f.id ? "#fff" : "var(--c-text)",
                }}>{f.label}</button>
              ))}
            </div>
          </>
        )}
      </div>

      <button className="btn-primary" onClick={submit} disabled={!isValid || loading}>
        {loading ? "Creating…"
          : isRecurring ? "Create recurring bill"
          : "Create bill"}
      </button>
    </Sheet>
  );
}
