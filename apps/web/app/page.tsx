import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Features } from "@/components/landing/features";
import { CTA } from "@/components/landing/cta";

export default function Home() {
  return (
    <main>
      <Hero />
      <HowItWorks />
      <Features />
      <CTA />
    </main>
  );
}
