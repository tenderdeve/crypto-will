import Link from "next/link";

export function Brand({ size = 22 }: { size?: number }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 no-underline">
      <svg width={size} height={size} viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="15" fill="none" stroke="var(--ink)" strokeWidth="1.4" />
        <path
          d="M11 16l3.5 3.5L22 12"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="16" cy="16" r="2" fill="var(--ink)" />
      </svg>
      <span
        className="serif leading-none"
        style={{ fontSize: size + 4, color: "var(--ink)" }}
      >
        ChainWill
      </span>
    </Link>
  );
}
