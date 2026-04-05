"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  {
    href: "/bills",
    label: "Bills",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="4" y="3" width="14" height="17" rx="2"
          stroke="currentColor" strokeWidth={active ? "1.8" : "1.5"} />
        <path d="M8 8h6M8 11.5h6M8 15h4"
          stroke="currentColor" strokeWidth={active ? "1.8" : "1.5"} strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/shopping",
    label: "Shopping",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M5 5h2l3 8h9l2-6H8.5"
          stroke="currentColor" strokeWidth={active ? "1.8" : "1.5"}
          strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="10" cy="18" r="1.5" fill="currentColor" />
        <circle cx="17" cy="18" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="8" r="4"
          stroke="currentColor" strokeWidth={active ? "1.8" : "1.5"} />
        <path d="M3 19c0-4 3.6-7 8-7s8 3 8 7"
          stroke="currentColor" strokeWidth={active ? "1.8" : "1.5"} strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div className="scroll-area safe-top">{children}</div>
      <nav className="tab-bar safe-bottom" style={{ display: "flex" }}>
        {tabs.map(tab => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link key={tab.href} href={tab.href} style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", gap: 3, padding: "10px 0",
              color: active ? "var(--c-primary)" : "var(--c-muted)",
              textDecoration: "none", transition: "color 0.15s",
            }}>
              {tab.icon(active)}
              <span style={{ fontSize: 10, fontWeight: active ? 600 : 400,
                letterSpacing: "0.02em" }}>{tab.label}</span>
              {active && (
                <div style={{ width: 4, height: 4, borderRadius: "50%",
                  background: "var(--c-primary)", marginTop: -2 }} />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
