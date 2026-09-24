/**
 * Services — the three core practices.
 * Data (titles, copy, tags, icon keys) lives in lib/content.ts (services).
 * Icon artwork lives in components/ui/icons.tsx.
 */
import { services } from "../lib/content";
import { icons } from "./ui/icons";
import GlassCard from "./ui/GlassCard";
import SectionHeading from "./ui/SectionHeading";

export default function Services() {
  return (
    <section id="services" className="relative mx-auto max-w-6xl scroll-mt-28 px-6 py-28">
      <SectionHeading eyebrow="Services">
        Everything the platform needs.
        <br />
        Nothing it doesn&apos;t.
      </SectionHeading>

      <div className="mt-14 grid gap-5 md:grid-cols-3">
        {services.map((service) => (
          <GlassCard
            key={service.title}
            className="rounded-[28px] p-8 transition duration-300 hover:-translate-y-1.5"
          >
            <div className={`inline-flex rounded-2xl bg-gradient-to-br p-3 ${service.tint}`}>
              {icons[service.icon]}
            </div>
            <h3 className="mt-6 text-xl font-semibold tracking-tight">{service.title}</h3>
            <p className="mt-3 text-[15px] leading-relaxed text-[#6e6e73]">{service.desc}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {service.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-white/60 px-3 py-1 text-[12px] font-medium text-[#424245] ring-1 ring-black/5"
                >
                  {tag}
                </span>
              ))}
            </div>
          </GlassCard>
        ))}
      </div>
    </section>
  );
}
