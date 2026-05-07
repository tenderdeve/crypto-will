import { Quote } from "lucide-react";

const testimonials = [
  {
    q: "[Placeholder — replace with a real user quote once available.]",
    n: "—",
    r: "placeholder",
  },
  {
    q: "[Placeholder — replace with a real user quote once available.]",
    n: "—",
    r: "placeholder",
  },
  {
    q: "[Placeholder — replace with a real user quote once available.]",
    n: "—",
    r: "placeholder",
  },
];

export function Testimonials() {
  return (
    <section className="px-6 py-24 md:px-12">
      <div className="mx-auto max-w-[1240px]">
        <div className="text-xs tracking-[0.12em] uppercase text-ink-3 mb-3">
          From people who&apos;ve set theirs up
        </div>
        <h2 className="serif text-4xl tracking-[-0.015em] mb-12 md:text-5xl">
          The reason this exists.
        </h2>
        <div className="grid grid-cols-1 gap-7 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <figure
              key={i}
              className={`m-0 p-7 border border-line rounded-cards ${
                i === 1 ? "bg-paper" : "bg-transparent"
              }`}
            >
              <div className="text-accent mb-4">
                <Quote className="w-[18px] h-[18px]" />
              </div>
              <blockquote className="serif text-[22px] leading-[1.35] text-ink m-0">
                &ldquo;{t.q}&rdquo;
              </blockquote>
              <figcaption className="mt-5 pt-5 border-t border-line flex justify-between text-[13px]">
                <span className="text-ink">{t.n}</span>
                <span className="text-ink-3">{t.r}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
