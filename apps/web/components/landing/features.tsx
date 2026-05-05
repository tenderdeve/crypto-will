import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ShieldCheck,
  Zap,
  Link2,
  Coins,
  Clock,
  Code2,
} from "lucide-react";

const features = [
  {
    icon: ShieldCheck,
    title: "Non-Custodial",
    description:
      "Your tokens stay in your wallet until transfer is triggered. We never hold your funds.",
  },
  {
    icon: Zap,
    title: "Gasless Alive Checks",
    description:
      "Prove you're active with a simple wallet signature. No transaction fees, no gas needed.",
  },
  {
    icon: Link2,
    title: "On-Chain Execution",
    description:
      "Transfers are executed trustlessly on-chain. Anyone can trigger them once the grace period expires.",
  },
  {
    icon: Coins,
    title: "Multi-Token Support",
    description:
      "Protect ERC-20 tokens and ETH. Include multiple assets in a single will.",
  },
  {
    icon: Clock,
    title: "Configurable Grace Period",
    description:
      "Choose an inactivity window from 30 to 180 days. Adjust anytime while you're active.",
  },
  {
    icon: Code2,
    title: "Open Source & Auditable",
    description:
      "All smart contract code is open source. Verify the logic yourself or commission an audit.",
  },
];

export function Features() {
  return (
    <section id="features" className="bg-muted/50 px-4 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Built for Security & Simplicity
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Everything you need to safeguard your digital assets
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="border">
              <CardHeader>
                <feature.icon className="h-8 w-8 text-primary" />
                <CardTitle className="mt-3 text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
