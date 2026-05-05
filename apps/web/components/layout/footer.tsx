import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t px-4 py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-sm text-muted-foreground">
          CryptoWill &copy; {new Date().getFullYear()}. Built on Base.
        </p>
        <div className="flex items-center gap-4">
          <Link
            href="https://github.com/tenderdeve/crypto-will"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            GitHub
          </Link>
        </div>
      </div>
    </footer>
  );
}
