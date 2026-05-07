export function TrustStrip() {
  const items = [
    ["Contract", "Verified on Base"],
    ["Network", "Base mainnet"],
    ["Executor", "Permissionless"],
    ["Audit", "Placeholder · pre-launch"],
  ];

  return (
    <div
      className="mt-12 p-7 rounded-cards grid grid-cols-2 gap-8 md:grid-cols-4"
      style={{ background: "var(--ink)", color: "var(--bg)" }}
    >
      {items.map(([k, v]) => (
        <div key={k}>
          <div className="text-[11px] tracking-[0.14em] uppercase text-white/50 mb-2">
            {k}
          </div>
          <div className="mono text-sm">{v}</div>
        </div>
      ))}
    </div>
  );
}
