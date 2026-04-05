"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useBills } from "@/lib/hooks/useBills";
import { useMembers } from "@/lib/hooks/useMembers";
import { Avatar } from "@/components/ui/Avatar";
import { Sheet } from "@/components/ui/Sheet";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { CreateBillSheet } from "@/components/bills/CreateBillSheet";
import type { BillWithSplits, Profile, PersonBalance } from "@/lib/types/database";

const FREQS = [
  { id: "weekly", label: "Weekly" }, { id: "monthly", label: "Monthly" },
  { id: "quarterly", label: "Quarterly" }, { id: "yearly", label: "Yearly" },
];

function freqLabel(f: string | null) {
  return FREQS.find(x => x.id === f)?.label ?? "";
}

/* ─── FreqBadge ─── */
function FreqBadge({ freq, nextDue, status }: {
  freq: string; nextDue: string | null; status: string;
}) {
  const due = status === "due";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <span style={{
        fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 6,
        background: due ? "var(--c-accent)" : "var(--c-primary)", color: "#fff",
      }}>↻ {freqLabel(freq)}</span>
      <span style={{ fontSize: 11, fontWeight: 600,
        color: due ? "var(--c-accent)" : "var(--c-muted)" }}>
        {due ? "Due now" : nextDue ? `Due ${nextDue}` : ""}
      </span>
    </div>
  );
}

/* ─── PersonSettleSheet ─── */
function PersonSettleSheet({ balance, currentUserId, onClose, onSettle }: {
  balance: PersonBalance;
  currentUserId: string;
  onClose: () => void;
  onSettle: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const { person, net, owedToMe, iOwe, items } = balance;
  const theyOweMe = net > 0;
  const settled = Math.abs(net) < 0.01;

  return (
    <Sheet onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
        <Avatar name={person.name} color={person.avatar_color} size={52} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--c-text)",
            letterSpacing: "-0.5px" }}>{person.name}</div>
          <div style={{ fontSize: 13, color: "var(--c-muted)", marginTop: 3 }}>
            {settled ? "All settled up 🎉"
              : theyOweMe ? `Owes you $${net.toFixed(2)} total`
              : `You owe $${Math.abs(net).toFixed(2)} total`}
          </div>
        </div>
      </div>

      {!settled && (
        <div style={{
          background: theyOweMe ? "#E8F5EA" : "#FFF0E8",
          border: `1.5px solid ${theyOweMe ? "#B8DEC0" : "#F5C5A0"}`,
          borderRadius: 14, padding: "14px 18px", marginBottom: 16,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: "var(--c-muted)", marginBottom: 4 }}>
              {theyOweMe ? `${person.name} owes you` : `You owe ${person.name}`}
            </div>
            <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-1px",
              color: theyOweMe ? "var(--c-green)" : "var(--c-accent)" }}>
              ${Math.abs(net).toFixed(2)}
            </div>
          </div>
          {owedToMe > 0 && iOwe > 0 && (
            <div style={{ textAlign: "right", fontSize: 11,
              color: "var(--c-muted)", lineHeight: 1.8 }}>
              <div>They owe <strong style={{ color: "var(--c-green)" }}>${owedToMe.toFixed(2)}</strong></div>
              <div>You owe <strong style={{ color: "var(--c-accent)" }}>${iOwe.toFixed(2)}</strong></div>
              <div style={{ borderTop: "1px solid var(--c-border)",
                paddingTop: 4, marginTop: 4 }}>
                Net <strong style={{ color: "var(--c-text)" }}>${Math.abs(net).toFixed(2)}</strong>
              </div>
            </div>
          )}
        </div>
      )}

      <p className="section-label" style={{ marginBottom: 10 }}>Bill by bill</p>
      {items.length === 0 && (
        <p style={{ fontSize: 13, color: "var(--c-muted)", textAlign: "center",
          padding: "16px 0" }}>No shared unsettled bills</p>
      )}
      {items.map((item, i) => {
        const owesDir = item.dir === "owes_me";
        return (
          <div key={i} className="card" style={{ marginBottom: 8, display: "flex",
            alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10,
              background: "var(--c-tag)", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
              {item.bill.is_recurring ? "↻" : "🧾"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {item.bill.title}
              </div>
              <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 2 }}>
                {owesDir ? `${person.name} owes you` : `You owe ${person.name}`}
              </div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700,
              color: owesDir ? "var(--c-green)" : "var(--c-accent)", flexShrink: 0 }}>
              {owesDir ? "" : "-"}${item.amt.toFixed(2)}
            </div>
          </div>
        );
      })}

      <div style={{ marginTop: 16 }}>
        {settled ? (
          <button className="btn-ghost" onClick={onClose}>Close</button>
        ) : confirming ? (
          <>
            <div style={{
              background: theyOweMe ? "var(--c-amber-bg)" : "#F0F7FF",
              border: `1.5px solid ${theyOweMe ? "#F5D88A" : "#B8D8F5"}`,
              borderRadius: 12, padding: "12px 14px", marginBottom: 12,
              fontSize: 13, color: "var(--c-text)", lineHeight: 1.6,
            }}>
              {theyOweMe
                ? <>Mark that <strong>{person.name}</strong> has paid you <strong>${net.toFixed(2)}</strong>? This settles all shared bills between you.</>
                : <>Mark that you&apos;ve paid <strong>{person.name}</strong> <strong>${Math.abs(net).toFixed(2)}</strong>? This settles all shared bills.</>
              }
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-ghost" onClick={() => setConfirming(false)}
                style={{ flex: 1 }}>Cancel</button>
              <button className="btn-primary" onClick={onSettle}
                style={{ flex: 2, background: theyOweMe ? "var(--c-green)" : "var(--c-primary)" }}>
                Yes, settle up
              </button>
            </div>
          </>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-ghost" onClick={onClose} style={{ flex: 1 }}>Close</button>
            {theyOweMe ? (
              <button className="btn-primary" onClick={() => setConfirming(true)}
                style={{ flex: 2, background: "var(--c-green)" }}>
                Mark paid
              </button>
            ) : (
              <button className="btn-primary" onClick={() => setConfirming(true)}
                style={{ flex: 2 }}>
                Settle ${Math.abs(net).toFixed(2)}
              </button>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}

/* ─── BillDetailSheet ─── */
function BillDetailSheet({ bill, currentUserId, onClose }: {
  bill: BillWithSplits; currentUserId: string; onClose: () => void;
}) {
  const payer = bill.payer;
  const unsettled = bill.splits.filter(s => !s.settled && !s.is_payer);

  return (
    <Sheet onClose={onClose}>
      <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--c-text)",
            marginBottom: 4 }}>{bill.title}</div>
          <div style={{ fontSize: 12, color: "var(--c-muted)" }}>
            {payer.name} paid · {bill.date} · ${Number(bill.amount).toFixed(2)}
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none",
          color: "var(--c-muted)", fontSize: 22, cursor: "pointer",
          padding: "0 4px", lineHeight: 1 }}>×</button>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        {bill.splits.map(sp => {
          const ok = sp.settled || sp.is_payer;
          const isMe = sp.user_id === currentUserId;
          return (
            <div key={sp.id} style={{
              display: "flex", alignItems: "center", gap: 10, marginBottom: 8,
              background: isMe ? "#F8F6F2" : "transparent",
              borderRadius: 8, padding: isMe ? "5px 8px" : "0",
            }}>
              <Avatar name={sp.profile.name} color={sp.profile.avatar_color} size={26} />
              <div style={{ flex: 1, fontSize: 13,
                fontWeight: isMe ? 600 : 500, color: "var(--c-text)" }}>
                {sp.profile.name}{isMe ? " (you)" : ""}
                {sp.is_payer && <span style={{ fontSize: 11, color: "var(--c-muted)" }}> · paid</span>}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700,
                color: ok ? "var(--c-green)" : "var(--c-text)" }}>
                ${Number(sp.amount).toFixed(2)}
              </div>
              <div style={{
                fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
                background: ok ? "#E8F5EA" : "#FFF0E8",
                color: ok ? "var(--c-green)" : "var(--c-accent)",
              }}>
                {sp.is_payer ? "Paid" : ok ? "✓" : "Owes"}
              </div>
            </div>
          );
        })}
      </div>

      {unsettled.length > 0 && (
        <div style={{
          background: "#FFF8F3", border: "1.5px solid #F5D5C0",
          borderRadius: 14, padding: "12px 14px", marginBottom: 14,
        }}>
          {unsettled.map((sp, i) => (
            <div key={sp.id} style={{
              display: "flex", alignItems: "center", gap: 10,
              marginBottom: i < unsettled.length - 1 ? 8 : 0,
            }}>
              <Avatar name={sp.profile.name} color={sp.profile.avatar_color} size={24} />
              <div style={{ flex: 1, fontSize: 13, color: "var(--c-muted)" }}>
                {sp.profile.name} → <strong style={{ color: "var(--c-text)" }}>{payer.name}</strong>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--c-accent)" }}>
                ${Number(sp.amount).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      )}
      <button className="btn-ghost" onClick={onClose}>Close</button>
    </Sheet>
  );
}

/* ─── RecurringDetailSheet ─── */
function RecurringDetailSheet({ bill, currentUserId, onClose, onMarkPaid, onSkip, onEdit }: {
  bill: BillWithSplits; currentUserId: string;
  onClose: () => void; onMarkPaid: () => void;
  onSkip: () => void; onEdit: () => void;
}) {
  const payer = bill.payer;
  const isDue = bill.recurring_status === "due";

  return (
    <Sheet onClose={onClose}>
      <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--c-text)",
            letterSpacing: "-0.5px", marginBottom: 8 }}>{bill.title}</div>
          <FreqBadge freq={bill.recurring_freq!}
            nextDue={bill.recurring_next_due} status={bill.recurring_status!} />
        </div>
        <button onClick={onEdit} style={{
          background: "var(--c-tag)", border: "none", color: "var(--c-text)",
          borderRadius: 10, padding: "7px 14px", fontSize: 12, fontWeight: 600,
          cursor: "pointer", marginRight: 8,
        }}>Edit</button>
        <button onClick={onClose} style={{ background: "none", border: "none",
          color: "var(--c-muted)", fontSize: 22, cursor: "pointer",
          padding: "0 4px", lineHeight: 1 }}>×</button>
      </div>

      {isDue && (
        <div style={{
          background: "var(--c-amber-bg)", border: "1.5px solid #F5D88A",
          borderRadius: 14, padding: "12px 16px", marginBottom: 14,
          display: "flex", gap: 12,
        }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--c-amber)" }}>
              Payment due now
            </div>
            <div style={{ fontSize: 12, color: "var(--c-muted)", marginTop: 3, lineHeight: 1.5 }}>
              <strong style={{ color: "var(--c-text)" }}>{payer.name}</strong> pays
              the provider upfront. Everyone else settles their share.
            </div>
          </div>
        </div>
      )}

      {/* Payer */}
      <div className="card" style={{ marginBottom: 12 }}>
        <p className="section-label" style={{ marginBottom: 10 }}>Who pays upfront</p>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar name={payer.name} color={payer.avatar_color} size={42} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--c-text)" }}>{payer.name}</div>
            <div style={{ fontSize: 12, color: "var(--c-muted)", marginTop: 2 }}>
              Account holder
            </div>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--c-text)" }}>
            ${Number(bill.amount).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Splits */}
      <div className="card" style={{ marginBottom: 12 }}>
        <p className="section-label" style={{ marginBottom: 10 }}>
          Split — ${(Number(bill.amount) / bill.splits.length).toFixed(2)} each
        </p>
        {bill.splits.map(sp => {
          const ok = sp.settled || sp.is_payer;
          const isMe = sp.user_id === currentUserId;
          return (
            <div key={sp.id} style={{
              display: "flex", alignItems: "center", gap: 10, marginBottom: 8,
              background: isMe ? "#F8F6F2" : "transparent",
              borderRadius: 8, padding: isMe ? "5px 8px" : "0",
            }}>
              <Avatar name={sp.profile.name} color={sp.profile.avatar_color} size={28} />
              <div style={{ flex: 1, fontSize: 13,
                fontWeight: isMe ? 600 : 500, color: "var(--c-text)" }}>
                {sp.profile.name}{isMe ? " · you" : ""}
                {sp.is_payer && <span style={{ fontSize: 11, color: "var(--c-muted)" }}> · pays</span>}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700,
                color: ok ? "var(--c-green)" : "var(--c-text)" }}>
                ${Number(sp.amount).toFixed(2)}
              </div>
              <div style={{
                fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
                background: ok ? "#E8F5EA" : "#FFF0E8",
                color: ok ? "var(--c-green)" : "var(--c-accent)",
              }}>
                {sp.is_payer ? "Pays" : ok ? "✓" : "Owes"}
              </div>
            </div>
          );
        })}
      </div>

      {/* History */}
      {bill.history && bill.history.length > 0 && (
        <div className="card" style={{ marginBottom: 14 }}>
          <p className="section-label" style={{ marginBottom: 10 }}>Payment history</p>
          {bill.history.slice(0, 6).map((h, i) => (
            <div key={h.id} style={{
              display: "flex", alignItems: "center", gap: 10,
              paddingBottom: i < Math.min(bill.history!.length, 6) - 1 ? 10 : 0,
              borderBottom: i < Math.min(bill.history!.length, 6) - 1
                ? "1px solid var(--c-border)" : "none",
              marginBottom: i < Math.min(bill.history!.length, 6) - 1 ? 10 : 0,
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                background: h.paid ? "#E8F5EA" : "#FFF0E8",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
              }}>
                {h.paid ? "✓" : "✗"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--c-text)" }}>{h.month}</div>
                {h.note && <div style={{ fontSize: 11, color: "var(--c-amber)", marginTop: 1 }}>{h.note}</div>}
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="amount" style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)" }}>
                  ${Number(h.amount).toFixed(2)}
                </div>
                <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 1 }}>
                  {h.paid ? "Paid" : "Missed"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isDue ? (
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-ghost" onClick={onSkip} style={{ flex: 1 }}>Skip</button>
          <button className="btn-primary" onClick={onMarkPaid} style={{ flex: 2 }}>
            Mark as paid
          </button>
        </div>
      ) : (
        <button className="btn-ghost" onClick={onClose}>Close</button>
      )}
    </Sheet>
  );
}

/* ─── EditRecurringSheet ─── */
function EditRecurringSheet({ bill, members, onClose, onSave }: {
  bill: BillWithSplits; members: Profile[];
  onClose: () => void; onSave: (updates: any) => void;
}) {
  const [title, setTitle] = useState(bill.title);
  const [amount, setAmount] = useState(String(bill.amount));
  const [freq, setFreq] = useState(bill.recurring_freq ?? "monthly");
  const [payer, setPayer] = useState(bill.paid_by);
  const [participants, setParticipants] = useState(bill.splits.map(s => s.user_id));
  const toggleP = (id: string) =>
    setParticipants(p => p.includes(id) ? (p.length > 1 ? p.filter(x => x !== id) : p) : [...p, id]);
  const amt = parseFloat(amount) || Number(bill.amount);
  const changed = amt !== Number(bill.amount);

  return (
    <Sheet onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--c-text)", flex: 1 }}>
          Edit recurring bill
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none",
          color: "var(--c-muted)", fontSize: 22, cursor: "pointer" }}>×</button>
      </div>

      <p className="section-label" style={{ marginBottom: 8 }}>Bill name</p>
      <input className="input" value={title} onChange={e => setTitle(e.target.value)}
        style={{ marginBottom: 14 }} />

      <p className="section-label" style={{ marginBottom: 8 }}>Amount</p>
      <div style={{ position: "relative", marginBottom: changed ? 6 : 14 }}>
        <span style={{ position: "absolute", left: 14, top: "50%",
          transform: "translateY(-50%)", fontSize: 16,
          color: "var(--c-muted)", fontWeight: 600 }}>$</span>
        <input className="input" value={amount}
          onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
          style={{ paddingLeft: 28, fontSize: 22, fontWeight: 700 }} />
      </div>
      {changed && (
        <p style={{ fontSize: 12, color: "var(--c-amber)", marginBottom: 14 }}>
          ⚠ Change applies from next occurrence
        </p>
      )}

      <p className="section-label" style={{ marginBottom: 8 }}>Frequency</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {FREQS.map(f => (
          <button key={f.id} onClick={() => setFreq(f.id)} style={{
            flex: 1, padding: "9px 4px", borderRadius: 10, fontSize: 12,
            fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            border: freq === f.id ? "none" : "1.5px solid var(--c-border)",
            background: freq === f.id ? "var(--c-primary)" : "transparent",
            color: freq === f.id ? "#fff" : "var(--c-text)",
          }}>{f.label}</button>
        ))}
      </div>

      <p className="section-label" style={{ marginBottom: 8 }}>Who pays upfront</p>
      <p style={{ fontSize: 12, color: "var(--c-muted)", marginBottom: 10 }}>
        The account holder who pays the provider directly.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {members.map(m => {
          const on = payer === m.id;
          return (
            <button key={m.id} onClick={() => setPayer(m.id)} style={{
              display: "flex", alignItems: "center", gap: 7, padding: "7px 13px",
              borderRadius: 20, cursor: "pointer", fontFamily: "inherit",
              fontWeight: 600, fontSize: 13,
              border: on ? "none" : "1.5px solid var(--c-border)",
              background: on ? m.avatar_color : "transparent",
              color: on ? "#fff" : "var(--c-text)",
            }}>
              <Avatar name={m.name} color={m.avatar_color} size={18} />
              {m.name}
            </button>
          );
        })}
      </div>

      <p className="section-label" style={{ marginBottom: 8 }}>Split with</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
        {members.map(m => {
          const on = participants.includes(m.id);
          return (
            <button key={m.id} onClick={() => toggleP(m.id)} style={{
              display: "flex", alignItems: "center", gap: 7, padding: "7px 13px",
              borderRadius: 20, cursor: "pointer", fontFamily: "inherit",
              fontWeight: 600, fontSize: 13,
              border: on ? "none" : "1.5px solid var(--c-border)",
              background: on ? m.avatar_color : "transparent",
              color: on ? "#fff" : "var(--c-text)",
            }}>
              <Avatar name={m.name} color={m.avatar_color} size={18} />
              {m.name}
            </button>
          );
        })}
      </div>
      {participants.length > 0 && (
        <p style={{ fontSize: 13, color: "var(--c-muted)", marginBottom: 20 }}>
          ${(amt / participants.length).toFixed(2)} per person · {participants.length} people
        </p>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
        <button className="btn-primary" onClick={() =>
          onSave({ title, amount: amt, paidBy: payer, freq, participants })}
          style={{ flex: 2 }}>Save changes</button>
      </div>
    </Sheet>
  );
}

export default function BillsPage() {
  const { profile, loading: userLoading } = useCurrentUser();
  const { members } = useMembers(profile?.group_id);
  const { bills, balances, loading: billsLoading,
    createBill, settlePerson, markRecurringPaid,
    skipRecurring, updateRecurringBill } = useBills(
    profile?.id ?? "", profile?.group_id ?? ""
  );

  const [subTab, setSubTab] = useState<"all" | "recurring" | "settled">("all");
  const [activeSheet, setActiveSheet] = useState<
    | { type: "create" }
    | { type: "detail"; bill: BillWithSplits }
    | { type: "recurring"; bill: BillWithSplits }
    | { type: "edit"; bill: BillWithSplits }
    | { type: "settle"; balance: PersonBalance }
    | null
  >(null);

  if (userLoading || billsLoading || !profile) return <FullPageSpinner />;
  const p = profile; // narrowed

  const myBills = bills.filter(b =>
    b.splits.some(s => s.user_id === p.id)
  );
  const recurring = myBills.filter(b => b.is_recurring);
  const dueBills = recurring.filter(b => b.recurring_status === "due");

  const shownBills =
    subTab === "recurring" ? recurring
    : subTab === "settled" ? myBills.filter(b => b.splits.every(s => s.settled || s.is_payer))
    : myBills;

  const totalOwedToMe = Object.values(balances)
    .reduce((s, b) => s + (b.net > 0 ? b.net : 0), 0);
  const totalIOwe = Object.values(balances)
    .reduce((s, b) => s + (b.net < 0 ? Math.abs(b.net) : 0), 0);
  const net = totalOwedToMe - totalIOwe;
  const others = members.filter(m => m.id !== p.id);

  function myStatus(bill: BillWithSplits) {
    const sp = bill.splits.find(s => s.user_id === p.id);
    if (!sp) return "none";
    if (sp.is_payer) return "payer";
    return sp.settled ? "settled" : "owes";
  }

  return (
    <div style={{ padding: "16px 0 120px" }}>
      {/* ── Header ── */}
      <div style={{ padding: "0 20px 12px",
        display: "flex", alignItems: "center", gap: 10 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--c-text)",
          letterSpacing: "-0.8px", flex: 1, margin: 0 }}>Bills</h1>
        <Avatar name={p.name} color={p.avatar_color} size={32} />
      </div>

      {/* ── Net balance card ── */}
      <div style={{
        margin: "0 16px 14px",
        background: net >= 0 ? "var(--c-primary)" : "#FFF0E8",
        border: net < 0 ? "1.5px solid #F5C5A0" : "none",
        borderRadius: 20, padding: "18px 20px",
      }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em",
          textTransform: "uppercase", marginBottom: 4, margin: 0,
          color: net >= 0 ? "rgba(255,255,255,0.55)" : "var(--c-muted)" }}>
          {net >= 0 ? "Overall you&apos;re owed" : "Overall you owe"}
        </p>
        <div className="amount" style={{
          fontSize: 36, fontWeight: 700, letterSpacing: "-1.5px", margin: "4px 0 2px",
          color: net >= 0 ? "#fff" : "var(--c-accent)",
        }}>
          ${Math.abs(net).toFixed(2)}
        </div>
        {totalOwedToMe > 0 && totalIOwe > 0 && (
          <p style={{ fontSize: 12, margin: 0,
            color: net >= 0 ? "rgba(255,255,255,0.5)" : "var(--c-muted)" }}>
            Owed ${totalOwedToMe.toFixed(2)} · You owe ${totalIOwe.toFixed(2)}
          </p>
        )}
      </div>

      {/* ── Per-person balances ── */}
      <div style={{ padding: "0 16px 4px" }}>
        <p className="section-label">With each person</p>
        {others.map(person => {
          const bal = balances[person.id];
          if (!bal) return null;
          const hasBalance = Math.abs(bal.net) >= 0.01;
          const theyOwe = bal.net > 0;
          return (
            <button key={person.id}
              onClick={() => setActiveSheet({ type: "settle", balance: bal })}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12,
                background: "var(--c-surface)",
                border: "1.5px solid var(--c-border)",
                borderRadius: 16, padding: "11px 14px", marginBottom: 8,
                cursor: "pointer", fontFamily: "inherit", textAlign: "left",
              }}>
              <Avatar name={person.name} color={person.avatar_color} size={38} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-text)" }}>
                  {person.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 2 }}>
                  {!hasBalance ? "All settled"
                    : theyOwe
                      ? `Owes you · ${bal.items.length} bill${bal.items.length > 1 ? "s" : ""}`
                      : `You owe · ${bal.items.length} bill${bal.items.length > 1 ? "s" : ""}`}
                </div>
              </div>
              {hasBalance ? (
                <div style={{ textAlign: "right" }}>
                  <div className="amount" style={{ fontSize: 15, fontWeight: 700,
                    color: theyOwe ? "var(--c-green)" : "var(--c-accent)" }}>
                    {theyOwe ? "+" : "-"}${Math.abs(bal.net).toFixed(2)}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 600, marginTop: 1,
                    color: theyOwe ? "var(--c-green)" : "var(--c-accent)" }}>
                    {theyOwe ? "Owes you" : "You owe"}
                  </div>
                </div>
              ) : <div style={{ fontSize: 20 }}>✓</div>}
            </button>
          );
        })}
      </div>

      {/* ── Due banner ── */}
      {dueBills.length > 0 && (
        <div style={{
          margin: "4px 16px 12px",
          background: "var(--c-amber-bg)", border: "1.5px solid #F5D88A",
          borderRadius: 16, padding: "11px 14px",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--c-amber)" }}>
              {dueBills.length} bill{dueBills.length > 1 ? "s" : ""} due now
            </div>
            <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 1 }}>
              {dueBills.map(b => b.title).join(" · ")}
            </div>
          </div>
          <button
            onClick={() => setActiveSheet({ type: "recurring", bill: dueBills[0] })}
            style={{ background: "var(--c-amber)", border: "none", color: "#fff",
              borderRadius: 9, padding: "5px 11px", fontSize: 11,
              fontWeight: 600, cursor: "pointer" }}>View</button>
        </div>
      )}

      {/* ── Sub tabs ── */}
      <div style={{ display: "flex", margin: "0 16px 12px",
        background: "var(--c-surface)", borderRadius: 12, padding: 3 }}>
        {([
          { id: "all", l: "All" },
          { id: "recurring", l: `Recurring (${recurring.length})` },
          { id: "settled", l: "Settled" },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)} style={{
            flex: 1, padding: "7px 4px", borderRadius: 9, fontSize: 11,
            fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: "none",
            background: subTab === t.id ? "var(--c-primary)" : "transparent",
            color: subTab === t.id ? "#fff" : "var(--c-muted)",
          }}>{t.l}</button>
        ))}
      </div>

      {/* ── Bill list ── */}
      <div style={{ padding: "0 16px" }}>
        {shownBills.length === 0 && (
          <div style={{ textAlign: "center", padding: "32px 0", color: "var(--c-muted)" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>No bills here</div>
          </div>
        )}
        {shownBills.map(bill => {
          const status = myStatus(bill);
          const mySplit = bill.splits.find(s => s.user_id === p.id);
          return (
            <button key={bill.id}
              onClick={() => setActiveSheet(
                bill.is_recurring
                  ? { type: "recurring", bill }
                  : { type: "detail", bill }
              )}
              style={{
                width: "100%", background: "var(--c-surface)", borderRadius: 18,
                padding: "13px 14px", marginBottom: 10, cursor: "pointer",
                border: "none", textAlign: "left", fontFamily: "inherit",
              }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, background: bill.recurring_status === "due"
                    ? "var(--c-amber-bg)" : "var(--c-tag)",
                }}>
                  {bill.is_recurring ? "↻" : "🧾"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600,
                    color: "var(--c-text)", marginBottom: 3 }}>{bill.title}</div>
                  {bill.is_recurring ? (
                    <FreqBadge freq={bill.recurring_freq!}
                      nextDue={bill.recurring_next_due}
                      status={bill.recurring_status!} />
                  ) : (
                    <div style={{ fontSize: 11, color: "var(--c-muted)" }}>
                      {bill.payer.name} paid · {bill.date}
                    </div>
                  )}
                  <div style={{ display: "flex", marginTop: 7, alignItems: "center" }}>
                    {bill.splits.map((sp, i) => (
                      <div key={sp.id} style={{
                        marginLeft: i > 0 ? -5 : 0,
                        border: "2px solid var(--c-surface)", borderRadius: "50%",
                      }}>
                        <Avatar name={sp.profile.name} color={sp.profile.avatar_color} size={18} />
                      </div>
                    ))}
                    <div style={{ marginLeft: 6, fontSize: 10, color: "var(--c-muted)" }}>
                      {bill.splits.length} people
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div className="amount" style={{ fontSize: 14, fontWeight: 700,
                    color: "var(--c-text)" }}>
                    ${Number(bill.amount).toFixed(2)}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--c-muted)" }}>total</div>
                  <div style={{
                    fontSize: 11, fontWeight: 700, marginTop: 4,
                    color: status === "payer" || status === "settled"
                      ? "var(--c-green)" : status === "owes"
                      ? "var(--c-accent)" : "var(--c-muted)",
                  }}>
                    {status === "payer" ? "You paid"
                      : status === "settled" ? "Settled"
                      : mySplit ? `Owe $${Number(mySplit.amount).toFixed(2)}` : "—"}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── FAB ── */}
      <button className="fab" onClick={() => setActiveSheet({ type: "create" })}>+</button>

      {/* ── Sheets ── */}
      {activeSheet?.type === "create" && (
        <CreateBillSheet
          members={members} currentUserId={p.id}
          onClose={() => setActiveSheet(null)}
          onCreate={createBill}
        />
      )}
      {activeSheet?.type === "detail" && (
        <BillDetailSheet
          bill={activeSheet.bill} currentUserId={p.id}
          onClose={() => setActiveSheet(null)}
        />
      )}
      {activeSheet?.type === "recurring" && (
        <RecurringDetailSheet
          bill={activeSheet.bill} currentUserId={p.id}
          onClose={() => setActiveSheet(null)}
          onMarkPaid={async () => {
            await markRecurringPaid(activeSheet.bill.id);
            setActiveSheet(null);
          }}
          onSkip={async () => {
            await skipRecurring(activeSheet.bill.id);
            setActiveSheet(null);
          }}
          onEdit={() => setActiveSheet({ type: "edit", bill: activeSheet.bill })}
        />
      )}
      {activeSheet?.type === "edit" && (
        <EditRecurringSheet
          bill={activeSheet.bill} members={members}
          onClose={() => setActiveSheet(null)}
          onSave={async updates => {
            await updateRecurringBill(activeSheet.bill.id, updates);
            setActiveSheet(null);
          }}
        />
      )}
      {activeSheet?.type === "settle" && (
        <PersonSettleSheet
          balance={activeSheet.balance} currentUserId={p.id}
          onClose={() => setActiveSheet(null)}
          onSettle={async () => {
            await settlePerson(activeSheet.balance.person.id);
            setActiveSheet(null);
          }}
        />
      )}
    </div>
  );
}
