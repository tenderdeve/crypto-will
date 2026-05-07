export function ActivityList({ grace }: { grace: boolean }) {
  const events = grace
    ? [
        { d: "Today", l: "Reminder sent", n: "Grace-period reminder by email" },
        { d: "Missed check-in", l: "Missed check-in", n: "Monthly email went unanswered" },
      ]
    : [
        { d: "Recent", l: "Checked in", n: "signAlive() on Base" },
        { d: "Earlier", l: "Will created", n: "createWill() tx on Base" },
      ];

  return (
    <div className="mt-6">
      <div className="text-[11px] tracking-[0.14em] uppercase text-ink-3 mb-3.5">
        Recent activity
      </div>
      <div className="bg-paper border border-line rounded-cards-lg">
        {events.map((e, i) => (
          <div
            key={i}
            className="grid gap-4 px-6 py-4"
            style={{
              gridTemplateColumns: "160px 200px 1fr",
              borderTop: i === 0 ? "none" : "1px solid var(--line-2)",
            }}
          >
            <div className="text-[13px] text-ink-3">{e.d}</div>
            <div
              className={`text-sm ${
                e.l === "Missed check-in" ? "text-danger" : "text-ink"
              }`}
            >
              {e.l}
            </div>
            <div className="mono text-xs text-ink-2">{e.n}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
