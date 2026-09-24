/**
 * JobsHero — hero for the /jobs page.
 * Copy lives in lib/content.ts (jobsHero); invite link in lib/site.ts.
 */
import { site } from "../lib/site";
import { jobsHero } from "../lib/content";
import GlassCard from "./ui/GlassCard";

export default function JobsHero() {
  return (
    <section className="relative mx-auto max-w-5xl px-6 pb-20 pt-40 text-center md:pt-48">
      <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-[#0071e3]">
        {jobsHero.eyebrow}
      </p>
      <h1 className="mt-4 text-5xl font-semibold leading-[1.04] tracking-[-0.02em] md:text-7xl">
        {jobsHero.titleTop}
        <br />
        {jobsHero.titleBottom}
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#6e6e73] md:text-xl">
        {jobsHero.subtitle}
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <a
          href={site.discordInvite}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-[#0071e3] px-8 py-3.5 font-semibold text-white shadow-[0_8px_24px_rgba(0,113,227,0.35)] transition hover:bg-[#0077ed]"
        >
          {jobsHero.primaryCta.label}
        </a>
        <GlassCard className="rounded-full transition hover:bg-white/60">
          <a href={jobsHero.secondaryCta.href} className="block px-8 py-3.5 font-semibold text-[#1d1d1f]">
            {jobsHero.secondaryCta.label}
          </a>
        </GlassCard>
      </div>

      <div className="mx-auto mt-16 grid max-w-3xl grid-cols-3 gap-4">
        {jobsHero.stats.map((stat) => (
          <GlassCard key={stat.label} className="rounded-[24px] px-4 py-6">
            <div className="text-3xl font-semibold tracking-tight">{stat.value}</div>
            <div className="mt-1 text-[12px] font-medium text-[#6e6e73]">{stat.label}</div>
          </GlassCard>
        ))}
      </div>
    </section>
  );
}
