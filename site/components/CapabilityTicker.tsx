/**
 * CapabilityTicker — infinite scrolling strip of platform capabilities.
 * Items come from lib/content.ts (capabilities). The list is duplicated
 * so the marquee loops seamlessly; animation lives in app/glass.css.
 */
import { capabilities } from "../lib/content";
import GlassCard from "./ui/GlassCard";

export default function CapabilityTicker() {
  const loop = [...capabilities, ...capabilities];
  return (
    <div className="relative mx-4 md:mx-auto md:max-w-5xl">
      <GlassCard className="overflow-hidden rounded-full py-3.5">
        <div className="snc-marquee flex w-max gap-10 whitespace-nowrap px-5">
          {loop.map((capability, i) => (
            <span key={i} className="text-[13px] font-medium text-[#424245]">
              {capability} <span className="ml-8 text-[#0071e3]">·</span>
            </span>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
