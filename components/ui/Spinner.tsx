export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <div
      className="spinner"
      style={{ width: size, height: size }}
    />
  );
}

export function FullPageSpinner() {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center",
      justifyContent: "center" }}>
      <Spinner size={32} />
    </div>
  );
}
