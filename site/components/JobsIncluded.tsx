/**
 * JobsIncluded — what subscribers actually get.
 * Items live in lib/content.ts (jobsIncluded).
 */
import { jobsIncluded } from "../lib/content";
import GlassCard from "./ui/GlassCard";

export default function JobsIncluded() {
  return (
    <section className="relative mx-auto max-w-6xl px-6 pb-24">
      <div className="text-center">
        <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-[#0071e3]">
          {jobsIncluded.eyebrow}
        </p>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
          {jobsIncluded.titleTop}
          <br />
          {jobsIncluded.titleBottom}
        </h2>
      </div>

      <div className="mt-14 grid gap-5 md:grid-cols-2">
        {jobsIncluded.items.map((item) => (
          <GlassCard key={item.title} className="rounded-[28px] p-8">
            <h3 className="text-lg font-semibold tracking-tight">{item.title}</h3>
            <p className="mt-3 text-[15px] leading-relaxed text-[#6e6e73]">{item.desc}</p>
          </GlassCard>
        ))}
      </div>
    </section>
  );
}
