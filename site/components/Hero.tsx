/**
 * Hero — headline, subcopy, CTAs, and the stat row.
 * Copy lives in lib/content.ts (hero); brand in lib/site.ts.
 */
import { hero } from "../lib/content";
import GlassCard from "./ui/GlassCard";

export default function Hero() {
  return (
    <section className="relative mx-auto max-w-5xl px-6 pb-24 pt-40 text-center md:pt-48">
      <GlassCard className="mx-auto inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[12px] font-medium text-[#424245]">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        {hero.badge}
      </GlassCard>

      <h1 className="mt-8 text-5xl font-semibold leading-[1.04] tracking-[-0.02em] md:text-7xl">
        {hero.titleTop}
        <br />
        {hero.titleBottom}
      </h1>

      <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#6e6e73] md:text-xl">
        {hero.subtitle}
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <a
          href={hero.primaryCta.href}
          className="rounded-full bg-[#0071e3] px-8 py-3.5 font-semibold text-white shadow-[0_8px_24px_rgba(0,113,227,0.35)] transition hover:bg-[#0077ed]"
        >
          {hero.primaryCta.label}
        </a>
        <GlassCard className="rounded-full transition hover:bg-white/60">
          <a href={hero.secondaryCta.href} className="block px-8 py-3.5 font-semibold text-[#1d1d1f]">
            {hero.secondaryCta.label}
          </a>
        </GlassCard>
      </div>

      <div className="mx-auto mt-16 grid max-w-3xl grid-cols-3 gap-4">
        {hero.stats.map((stat) => (
          <GlassCard key={stat.label} className="rounded-[24px] px-4 py-6">
            <div className="text-3xl font-semibold tracking-tight">{stat.value}</div>
            <div className="mt-1 text-[12px] font-medium text-[#6e6e73]">{stat.label}</div>
          </GlassCard>
        ))}
      </div>
    </section>
  );
}
