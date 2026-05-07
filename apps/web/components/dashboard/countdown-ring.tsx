export function CountdownRing({
  pct,
  color,
  bg,
  big,
  unit,
  sub,
  textColor,
}: {
  pct: number;
  color: string;
  bg: string;
  big: string;
  unit: string;
  sub: string;
  textColor: string;
}) {
  const r = 92;
  const c = 2 * Math.PI * r;
  const dash = c * (1 - pct);

  return (
    <div className="relative w-[220px] h-[220px]">
      <svg
        width="220"
        height="220"
        viewBox="0 0 220 220"
        style={{ transform: "rotate(-90deg)" }}
      >
        <circle
          cx="110"
          cy="110"
          r={r}
          stroke={bg}
          strokeWidth="14"
          fill="none"
        />
        <circle
          cx="110"
          cy="110"
          r={r}
          stroke={color}
          strokeWidth="14"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={dash}
        />
      </svg>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ color: textColor }}
      >
        <div className="serif text-[56px] leading-none tracking-[-0.02em]">
          {big}
        </div>
        <div className="text-xs opacity-60 mt-1">{unit}</div>
        <div className="text-[10px] tracking-[0.12em] uppercase opacity-55 mt-1.5 text-center max-w-[160px] leading-[1.3]">
          {sub}
        </div>
      </div>
    </div>
  );
}
