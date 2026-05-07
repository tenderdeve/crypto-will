export function LandingFooter() {
  return (
    <footer className="px-6 py-8 flex flex-col justify-between gap-2 text-ink-3 text-[13px] sm:flex-row md:px-12">
      <span>© {new Date().getFullYear()} ChainWill · Built on Base</span>
      <a
        href="https://github.com/tenderdeve/crypto-will"
        target="_blank"
        rel="noopener noreferrer"
        className="text-ink-3 hover:text-ink transition-colors no-underline"
      >
        GitHub
      </a>
    </footer>
  );
}
