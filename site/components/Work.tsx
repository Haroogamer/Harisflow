/**
 * Work — portfolio proof points.
 * Items live in lib/content.ts (builds). Add a new build there; it renders here.
 */
import { builds } from "../lib/content";
import GlassCard from "./ui/GlassCard";
import SectionHeading from "./ui/SectionHeading";

export default function Work() {
  return (
    <section id="work" className="relative mx-auto max-w-6xl scroll-mt-28 px-6 pb-28">
      <SectionHeading eyebrow="Recent work">
        Shipped. Documented.
        <br />
        Running in production.
      </SectionHeading>

      <div className="mt-14 grid gap-5 md:grid-cols-3">
        {builds.map((build, i) => (
          <GlassCard
            key={build.title}
            variant="strong"
            className="flex flex-col rounded-[28px] p-8 transition duration-300 hover:-translate-y-1.5"
          >
            <span className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#0071e3]">
              0{i + 1}
            </span>
            <h3 className="mt-3 text-lg font-semibold tracking-tight">{build.title}</h3>
            <p className="mt-3 flex-1 text-[15px] leading-relaxed text-[#6e6e73]">{build.desc}</p>
          </GlassCard>
        ))}
      </div>
    </section>
  );
}
