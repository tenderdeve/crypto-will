import { LandingHeader } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Testimonials } from "@/components/landing/testimonials";
import { TrustFAQ } from "@/components/landing/trust-faq";
import { LandingFooter } from "@/components/landing/footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-bg">
      <LandingHeader />
      <Hero />
      <HowItWorks />
      <Testimonials />
      <TrustFAQ />
      <LandingFooter />
    </main>
  );
}
