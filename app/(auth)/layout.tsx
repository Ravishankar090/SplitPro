export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="safe-top" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      {children}
    </div>
  );
}
