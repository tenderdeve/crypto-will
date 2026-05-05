import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          CryptoWill
        </h1>
        <p className="mt-4 text-xl text-muted-foreground sm:text-2xl">
          Protect your crypto legacy
        </p>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          A dead man&apos;s switch for your digital assets. Set up automatic
          transfers to your beneficiaries if you become inactive. Secure,
          on-chain, and non-custodial.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <ConnectButton />
        </div>
        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div className="rounded-lg border bg-card p-6 text-card-foreground">
            <h3 className="text-lg font-semibold">Create a Will</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Choose your beneficiary, select tokens, and set your inactivity
              period.
            </p>
          </div>
          <div className="rounded-lg border bg-card p-6 text-card-foreground">
            <h3 className="text-lg font-semibold">Stay Alive</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Periodically confirm you&apos;re active by signing a simple
              message.
            </p>
          </div>
          <div className="rounded-lg border bg-card p-6 text-card-foreground">
            <h3 className="text-lg font-semibold">Auto Transfer</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              If you miss your check-in, tokens are automatically released to
              your beneficiary.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
