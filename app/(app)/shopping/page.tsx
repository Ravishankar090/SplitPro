"use client";
export const dynamic = "force-dynamic";

import { useState, useRef } from "react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useShopping } from "@/lib/hooks/useShopping";
import { useMembers } from "@/lib/hooks/useMembers";
import { Avatar } from "@/components/ui/Avatar";
import { Sheet } from "@/components/ui/Sheet";
import { FullPageSpinner, Spinner } from "@/components/ui/Spinner";
import type { ShoppingItem, Profile } from "@/lib/types/database";

const STORES = ["Costco","Aldi","Trader Joe's","Walmart","Target","Whole Foods"];
const UNITS  = ["","each","lb","kg","oz","pack","bottle","gallon","loaf","dozen","bag","bunch","can"];

/* ─── AddItemSheet ─── */
function AddItemSheet({ members, currentUserId, onClose, onAdd }: {
  members: Profile[]; currentUserId: string;
  onClose: () => void;
  onAdd: (i: { name:string; qty:number; unit:string; store:string; requestedBy:string }) => Promise<void>;
}) {
  const [name, setName]           = useState("");
  const [qty,  setQty]            = useState("1");
  const [unit, setUnit]           = useState("");
  const [store, setStore]         = useState("");
  const [custom, setCustom]       = useState("");
  const [forUser, setForUser]     = useState(currentUserId);
  const [loading, setLoading]     = useState(false);
  const valid = name.trim() && (store || custom.trim());

  async function add() {
    if (!valid) return;
    setLoading(true);
    await onAdd({ name: name.trim(), qty: parseFloat(qty)||1, unit, store: store||custom.trim(), requestedBy: forUser });
    onClose();
  }

  return (
    <Sheet onClose={onClose}>
      <div style={{ fontSize:18, fontWeight:700, color:"var(--c-text)", marginBottom:18 }}>
        Add to shopping list
      </div>

      <p className="section-label" style={{ marginBottom:8 }}>Item name</p>
      <input className="input" value={name} onChange={e=>setName(e.target.value)}
        placeholder="e.g. Whole milk" autoFocus style={{ marginBottom:14 }} />

      <p className="section-label" style={{ marginBottom:8 }}>Quantity & unit</p>
      <div style={{ display:"flex", gap:8, marginBottom:14 }}>
        <input className="input" value={qty}
          onChange={e=>setQty(e.target.value.replace(/[^0-9.]/g,""))}
          inputMode="decimal" style={{ width:72, flex:"none" }} />
        <div style={{ flex:1, display:"flex", gap:6, flexWrap:"wrap" }}>
          {UNITS.slice(0,9).map(u=>(
            <button key={u} onClick={()=>setUnit(u)} style={{
              padding:"6px 10px", borderRadius:8, fontSize:12, fontWeight:600,
              cursor:"pointer", fontFamily:"inherit",
              border: unit===u ? "none" : "1.5px solid var(--c-border)",
              background: unit===u ? "var(--c-primary)" : "transparent",
              color: unit===u ? "#fff" : "var(--c-text)",
            }}>{u||"none"}</button>
          ))}
        </div>
      </div>

      <p className="section-label" style={{ marginBottom:8 }}>Store</p>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:8 }}>
        {STORES.map(s=>(
          <button key={s} onClick={()=>{ setStore(s); setCustom(""); }} style={{
            padding:"7px 13px", borderRadius:20, fontSize:12, fontWeight:600,
            cursor:"pointer", fontFamily:"inherit",
            border: store===s ? "none" : "1.5px solid var(--c-border)",
            background: store===s ? "var(--c-primary)" : "transparent",
            color: store===s ? "#fff" : "var(--c-text)",
          }}>{s}</button>
        ))}
      </div>
      <input className="input" value={custom}
        onChange={e=>{ setCustom(e.target.value); setStore(""); }}
        placeholder="Or type a different store…" style={{ marginBottom:14 }} />

      <p className="section-label" style={{ marginBottom:8 }}>For</p>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:22 }}>
        {members.map(m=>{
          const on = forUser===m.id;
          return (
            <button key={m.id} onClick={()=>setForUser(m.id)} style={{
              display:"flex", alignItems:"center", gap:7, padding:"7px 13px",
              borderRadius:20, cursor:"pointer", fontFamily:"inherit",
              fontWeight:600, fontSize:13,
              border: on ? "none" : "1.5px solid var(--c-border)",
              background: on ? m.avatar_color : "transparent",
              color: on ? "#fff" : "var(--c-text)",
            }}>
              <Avatar name={m.name} color={m.avatar_color} size={18} />
              {m.name}{m.id===currentUserId?" (me)":""}
            </button>
          );
        })}
      </div>

      <div style={{ display:"flex", gap:8 }}>
        <button className="btn-ghost" onClick={onClose} style={{ flex:1 }}>Cancel</button>
        <button className="btn-primary" onClick={add} disabled={!valid||loading} style={{ flex:2 }}>
          {loading ? "Adding…" : "Add item"}
        </button>
      </div>
    </Sheet>
  );
}

/* ─── ShoppingModeSheet ─── */
function ShoppingModeSheet({ store, items, members, currentUserId, onClose, onFinish }: {
  store: string; items: ShoppingItem[]; members: Profile[];
  currentUserId: string; onClose: ()=>void; onFinish: (ids:string[])=>void;
}) {
  const [cart, setCart] = useState<Set<string>>(new Set());
  const storeItems = items.filter(i => i.store===store && i.status==="pending");
  const mine       = storeItems.filter(i => i.requested_by===currentUserId);
  const others     = storeItems.filter(i => i.requested_by!==currentUserId);
  const grouped    = members
    .filter(m => m.id!==currentUserId)
    .map(m => ({ member:m, items: others.filter(i=>i.requested_by===m.id) }))
    .filter(g => g.items.length>0);
  const toggle = (id:string) => setCart(p=>{ const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n; });
  const pct = storeItems.length>0 ? (cart.size/storeItems.length)*100 : 0;

  function ItemRow({ item, forOther }: { item: ShoppingItem; forOther: boolean }) {
    const checked    = cart.has(item.id);
    const requester  = members.find(m=>m.id===item.requested_by);
    return (
      <button onClick={()=>toggle(item.id)} style={{
        width:"100%", display:"flex", alignItems:"center", gap:12,
        background: checked?(forOther?"#E8F5EA":"var(--c-tag)"):"var(--c-surface)",
        border:`1.5px solid ${checked?(forOther?"#B8DEC0":"var(--c-border)"):"var(--c-border)"}`,
        borderRadius:14, padding:"12px 14px", marginBottom:8,
        cursor:"pointer", fontFamily:"inherit", textAlign:"left",
      }}>
        <div style={{
          width:26, height:26, borderRadius:8, flexShrink:0,
          border: checked?"none":"2px solid var(--c-border)",
          background: checked?(forOther?"var(--c-green)":"var(--c-primary)"):"transparent",
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          {checked&&<svg width="13" height="13" viewBox="0 0 13 13">
            <polyline points="2,6.5 5.5,10 11,3" stroke="#fff" strokeWidth="2"
              fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, fontWeight:600, color:"var(--c-text)",
            textDecoration: checked?"line-through":"none", opacity: checked?0.7:1 }}>
            {item.name}
          </div>
          <div style={{ fontSize:12, color:"var(--c-muted)", marginTop:1 }}>
            {item.qty}{item.unit?` ${item.unit}`:""}
            {forOther&&requester&&!checked&&(
              <span style={{ color:requester.avatar_color, fontWeight:600 }}>{" · for "}{requester.name}</span>
            )}
            {forOther&&checked&&<span style={{ color:"var(--c-green)", fontWeight:600 }}>{" · picked up ✓"}</span>}
          </div>
        </div>
        {forOther&&requester&&<Avatar name={requester.name} color={requester.avatar_color} size={28}/>}
      </button>
    );
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"var(--c-bg)", zIndex:60,
      display:"flex", flexDirection:"column", maxWidth:430, margin:"0 auto" }}>
      <div style={{ padding:"52px 20px 12px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
          <button onClick={onClose} style={{ background:"none", border:"none",
            cursor:"pointer", color:"var(--c-muted)", fontSize:22, padding:0, lineHeight:1 }}>←</button>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:20, fontWeight:700, color:"var(--c-text)", letterSpacing:"-0.5px" }}>
              At {store}
            </div>
            <div style={{ fontSize:12, color:"var(--c-muted)", marginTop:1 }}>
              {cart.size} of {storeItems.length} picked up
            </div>
          </div>
          <div style={{ fontSize:14, fontWeight:700,
            color: cart.size===storeItems.length&&storeItems.length>0?"var(--c-green)":"var(--c-primary)" }}>
            {cart.size}/{storeItems.length}
          </div>
        </div>
        <div style={{ height:6, background:"var(--c-border)", borderRadius:3, overflow:"hidden" }}>
          <div style={{ height:"100%", borderRadius:3,
            background: cart.size===storeItems.length&&storeItems.length>0?"var(--c-green)":"var(--c-primary)",
            width:`${pct}%`, transition:"width 0.3s" }}/>
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"4px 20px 0",
        WebkitOverflowScrolling:"touch" as const }}>
        {storeItems.length===0&&(
          <div style={{ textAlign:"center", padding:"48px 0", color:"var(--c-muted)" }}>
            <div style={{ fontSize:36, marginBottom:8 }}>🛒</div>
            <div style={{ fontSize:14, fontWeight:600 }}>Nothing needed from {store}</div>
          </div>
        )}
        {mine.length>0&&<>
          <p className="section-label" style={{ marginBottom:10 }}>Your items</p>
          {mine.map(item=><ItemRow key={item.id} item={item} forOther={false}/>)}
        </>}
        {grouped.map(({ member, items:gi })=>(
          <div key={member.id}>
            <div style={{ display:"flex", alignItems:"center", gap:8, margin:"14px 0 10px" }}>
              <Avatar name={member.name} color={member.avatar_color} size={24}/>
              <span style={{ fontSize:12, fontWeight:600, color:"var(--c-text)" }}>{member.name}&apos;s items</span>
              <span style={{ fontSize:11, color:"var(--c-muted)" }}>· pick up if you can</span>
            </div>
            {gi.map(item=><ItemRow key={item.id} item={item} forOther/>)}
          </div>
        ))}
      </div>

      <div style={{ padding:"12px 20px 32px", borderTop:"1px solid var(--c-border)", background:"var(--c-surface)" }}>
        <button className="btn-primary" onClick={()=>onFinish([...cart])}
          style={{ background: cart.size>0?"var(--c-primary)":"var(--c-tag)",
            color: cart.size>0?"#fff":"var(--c-text)" }}>
          {cart.size===0?"Cancel — nothing picked up":`Finish shopping (${cart.size} item${cart.size>1?"s":""})`}
        </button>
      </div>
    </div>
  );
}

/* ─── CheckoutSheet ─── */
function CheckoutSheet({ pickedIds, items, members, currentUserId, store, onClose, onConfirm }: {
  pickedIds: string[]; items: ShoppingItem[]; members: Profile[];
  currentUserId: string; store: string;
  onClose: ()=>void; onConfirm: ()=>void;
}) {
  const picked     = items.filter(i=>pickedIds.includes(i.id));
  const myItems    = picked.filter(i=>i.requested_by===currentUserId);
  const forOthers  = members
    .filter(m=>m.id!==currentUserId)
    .map(m=>({ member:m, items: picked.filter(i=>i.requested_by===m.id) }))
    .filter(g=>g.items.length>0);

  return (
    <Sheet onClose={onClose}>
      <div style={{ fontSize:18, fontWeight:700, color:"var(--c-text)", marginBottom:4 }}>
        Shopping done at {store}
      </div>
      <p style={{ fontSize:13, color:"var(--c-muted)", marginBottom:18 }}>
        {picked.length} item{picked.length>1?"s":""} picked up
      </p>

      {myItems.length>0&&(
        <div className="card" style={{ marginBottom:12 }}>
          <p className="section-label" style={{ marginBottom:10 }}>Your items</p>
          {myItems.map(item=>(
            <div key={item.id} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
              <span style={{ fontSize:14, color:"var(--c-green)" }}>✓</span>
              <span style={{ fontSize:13, color:"var(--c-text)" }}>
                {item.name} · {item.qty}{item.unit?` ${item.unit}`:""}
              </span>
            </div>
          ))}
        </div>
      )}

      {forOthers.length>0&&(
        <div style={{ background:"#E8F5EA", border:"1.5px solid #B8DEC0",
          borderRadius:14, padding:"12px 14px", marginBottom:16 }}>
          <p className="section-label" style={{ marginBottom:10, color:"var(--c-green)" }}>
            You picked up for others
          </p>
          {forOthers.map(({ member, items:gi })=>(
            <div key={member.id} style={{ marginBottom:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                <Avatar name={member.name} color={member.avatar_color} size={24}/>
                <span style={{ fontSize:13, fontWeight:600, color:"var(--c-text)" }}>{member.name}</span>
              </div>
              {gi.map(item=>(
                <div key={item.id} style={{ display:"flex", alignItems:"center",
                  gap:8, paddingLeft:32, marginBottom:4 }}>
                  <span style={{ fontSize:13, color:"var(--c-green)" }}>✓</span>
                  <span style={{ fontSize:13, color:"var(--c-text)" }}>
                    {item.name} · {item.qty}{item.unit?` ${item.unit}`:""}
                  </span>
                </div>
              ))}
            </div>
          ))}
          <p style={{ fontSize:12, color:"var(--c-green)", margin:"8px 0 0",
            borderTop:"1px solid #B8DEC0", paddingTop:10 }}>
            💡 {forOthers.map(g=>g.member.name).join(" & ")} can settle up with you — add a bill in the Bills tab.
          </p>
        </div>
      )}

      <button className="btn-primary" onClick={onConfirm}>Mark all as done</button>
    </Sheet>
  );
}

/* ═══════════════════════════════════════════
   MAIN SHOPPING PAGE
═══════════════════════════════════════════ */
export default function ShoppingPage() {
  const { profile, loading: userLoading } = useCurrentUser();
  const { members } = useMembers(profile?.group_id);
  const { items, byStore, loading, addItem, removeItem, markBought, clearDone } =
    useShopping(profile?.group_id ?? "");

  const [filter,        setFilter]        = useState<"all"|"mine">("all");
  const [showAdd,       setShowAdd]       = useState(false);
  const [shoppingStore, setShoppingStore] = useState<string|null>(null);
  const [checkout,      setCheckout]      = useState<{ pickedIds:string[]; store:string }|null>(null);

  if (userLoading || loading || !profile) return <FullPageSpinner/>;
  const p = profile; // narrowed — non-null below

  const doneItems = items.filter(i=>i.status==="done");
  const stores    = Object.keys(byStore).sort();

  function filteredStoreItems(si: ShoppingItem[]) {
    return filter==="mine" ? si.filter(i=>i.requested_by===p.id) : si;
  }

  async function finishShopping(pickedIds: string[]) {
    const store = shoppingStore!;
    setShoppingStore(null);
    if (pickedIds.length===0) return;
    setCheckout({ pickedIds, store });
  }

  async function confirmCheckout() {
    if (!checkout) return;
    await markBought(checkout.pickedIds, p.id);
    setCheckout(null);
  }

  return (
    <div style={{ padding:"16px 0 120px" }}>
      {/* Header */}
      <div style={{ padding:"0 20px 12px", display:"flex", alignItems:"center", gap:10 }}>
        <h1 style={{ fontSize:24, fontWeight:700, color:"var(--c-text)",
          letterSpacing:"-0.8px", flex:1, margin:0 }}>Shopping</h1>
        {doneItems.length>0&&(
          <button onClick={clearDone} style={{ background:"none", border:"none",
            color:"var(--c-muted)", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
            Clear done ({doneItems.length})
          </button>
        )}
      </div>

      {/* Filter */}
      <div style={{ display:"flex", margin:"0 16px 16px",
        background:"var(--c-surface)", borderRadius:12, padding:3 }}>
        {([{id:"all",l:"All items"},{id:"mine",l:"My items"}] as const).map(t=>(
          <button key={t.id} onClick={()=>setFilter(t.id)} style={{
            flex:1, padding:"7px", borderRadius:9, fontSize:12, fontWeight:600,
            cursor:"pointer", fontFamily:"inherit", border:"none",
            background: filter===t.id?"var(--c-primary)":"transparent",
            color: filter===t.id?"#fff":"var(--c-muted)",
          }}>{t.l}</button>
        ))}
      </div>

      {/* Store sections */}
      <div style={{ padding:"0 16px" }}>
        {stores.length===0&&(
          <div style={{ textAlign:"center", padding:"40px 0", color:"var(--c-muted)" }}>
            <div style={{ fontSize:40, marginBottom:8 }}>🛒</div>
            <div style={{ fontSize:14, fontWeight:600 }}>Nothing on the list</div>
            <div style={{ fontSize:12, marginTop:4 }}>Tap + to add items</div>
          </div>
        )}

        {stores.map(store=>{
          const storeItems = filteredStoreItems(byStore[store]??[]);
          if (storeItems.length===0) return null;
          const othersCount = storeItems.filter(i=>i.requested_by!==p.id).length;
          return (
            <div key={store} style={{ marginBottom:20 }}>
              <div style={{ display:"flex", alignItems:"center", marginBottom:10 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:15, fontWeight:700, color:"var(--c-text)" }}>{store}</div>
                  <div style={{ fontSize:11, color:"var(--c-muted)", marginTop:1 }}>
                    {storeItems.length} item{storeItems.length>1?"s":""}
                    {othersCount>0&&<span style={{ color:"#1A4A7C" }}>{" · "}{othersCount} from others</span>}
                  </div>
                </div>
                <button onClick={()=>setShoppingStore(store)} style={{
                  display:"flex", alignItems:"center", gap:5, background:"#1A4A7C",
                  border:"none", color:"#fff", borderRadius:12, padding:"7px 13px",
                  fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
                }}>🛍 Going here?</button>
              </div>

              {storeItems.map(item=>{
                const requester = members.find(m=>m.id===item.requested_by);
                const isMe      = item.requested_by===p.id;
                return (
                  <div key={item.id} style={{
                    display:"flex", alignItems:"center", gap:10,
                    background:"var(--c-surface)", borderRadius:13,
                    padding:"10px 12px", marginBottom:6,
                    borderLeft:`3px solid ${requester?.avatar_color??"var(--c-border)"}`,
                  }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:"var(--c-text)" }}>{item.name}</div>
                      <div style={{ fontSize:11, color:"var(--c-muted)", marginTop:2 }}>
                        {item.qty}{item.unit?` ${item.unit}`:""}
                      </div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      {requester&&(
                        <span style={{ fontSize:11, fontWeight:600, color:requester.avatar_color,
                          background:requester.avatar_color+"18", padding:"2px 7px", borderRadius:6 }}>
                          {isMe?"Mine":requester.name}
                        </span>
                      )}
                      <button onClick={()=>removeItem(item.id)} style={{ background:"none",
                        border:"none", color:"var(--c-border)", fontSize:16,
                        cursor:"pointer", padding:"0 2px", lineHeight:1 }}>×</button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Done */}
        {doneItems.length>0&&(
          <div style={{ marginBottom:16 }}>
            <p className="section-label">Picked up ({doneItems.length})</p>
            {doneItems.map(item=>{
              const buyer     = members.find(m=>m.id===item.bought_by);
              const requester = members.find(m=>m.id===item.requested_by);
              return (
                <div key={item.id} style={{ display:"flex", alignItems:"center", gap:10,
                  background:"var(--c-surface)", borderRadius:13, padding:"10px 12px",
                  marginBottom:6, opacity:0.55 }}>
                  <div style={{ width:20, height:20, borderRadius:6, background:"var(--c-green)",
                    display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <svg width="11" height="11" viewBox="0 0 11 11">
                      <polyline points="1.5,5.5 4.5,8.5 9.5,2.5" stroke="#fff" strokeWidth="1.8"
                        fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500, color:"var(--c-muted)",
                      textDecoration:"line-through" }}>{item.name}</div>
                    <div style={{ fontSize:11, color:"var(--c-muted)", marginTop:1 }}>
                      {item.store} · {requester?.name}
                      {buyer&&buyer.id!==item.requested_by&&(
                        <span style={{ color:"var(--c-green)" }}>{" · picked up by "}{buyer.name}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FAB */}
      <button className="fab" onClick={()=>setShowAdd(true)}>+</button>

      {/* Sheets */}
      {showAdd&&(
        <AddItemSheet members={members} currentUserId={p.id}
          onClose={()=>setShowAdd(false)}
          onAdd={i=>addItem({ name:i.name, qty:i.qty, unit:i.unit, store:i.store, requestedBy:i.requestedBy })}/>
      )}
      {shoppingStore&&(
        <ShoppingModeSheet store={shoppingStore} items={items} members={members}
          currentUserId={p.id}
          onClose={()=>setShoppingStore(null)} onFinish={finishShopping}/>
      )}
      {checkout&&(
        <CheckoutSheet pickedIds={checkout.pickedIds} items={items} members={members}
          currentUserId={p.id} store={checkout.store}
          onClose={()=>setCheckout(null)} onConfirm={confirmCheckout}/>
      )}
    </div>
  );
}
