/**
 * JobsHowItWorks — three steps to get the alerts.
 * Steps live in lib/content.ts (jobsSteps).
 */
import { jobsSteps } from "../lib/content";
import GlassCard from "./ui/GlassCard";
import SectionHeading from "./ui/SectionHeading";

export default function JobsHowItWorks() {
  return (
    <section id="how-it-works" className="relative mx-auto max-w-6xl scroll-mt-28 px-6 py-24">
      <GlassCard className="rounded-[36px] p-10 md:p-16">
        <SectionHeading eyebrow="How it works">Three steps. Thirty seconds.</SectionHeading>

        <div className="mt-12 grid gap-10 md:grid-cols-3">
          {jobsSteps.map((step, i) => (
            <div key={step.title} className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#0071e3] text-lg font-semibold text-white shadow-[0_8px_20px_rgba(0,113,227,0.35)]">
                {i + 1}
              </div>
              <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
              <p className="mx-auto mt-2 max-w-xs text-[15px] leading-relaxed text-[#6e6e73]">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </GlassCard>
    </section>
  );
}
