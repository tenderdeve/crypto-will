import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, HeartPulse, ArrowRightLeft } from "lucide-react";

const steps = [
  {
    icon: FileText,
    title: "Create Your Will",
    description:
      "Choose your beneficiary, select the tokens to include, and set your inactivity grace period. Your assets stay in your wallet.",
  },
  {
    icon: HeartPulse,
    title: "Confirm You're Alive",
    description:
      "Periodically sign a gasless message with your wallet to prove you're still active. No transaction fees required.",
  },
  {
    icon: ArrowRightLeft,
    title: "Automatic Transfer",
    description:
      "If you miss your check-in window, anyone can trigger the on-chain transfer of your tokens to your beneficiary. Trustless and unstoppable.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="px-4 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            How It Works
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Three simple steps to protect your digital legacy
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {steps.map((step, index) => (
            <Card key={step.title} className="relative border-2">
              <div className="absolute -top-4 left-6 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                {index + 1}
              </div>
              <CardHeader className="pt-8">
                <step.icon className="h-10 w-10 text-primary" />
                <CardTitle className="mt-4 text-xl">{step.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
