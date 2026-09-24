/**
 * Navbar — floating glass pill, fixed to the top of the viewport.
 * Links and brand come from lib/site.ts.
 */
import { site } from "../lib/site";
import GlassCard from "./ui/GlassCard";

export default function Navbar() {
  return (
    <header className="fixed inset-x-0 top-4 z-50 mx-auto max-w-4xl px-4">
      <GlassCard className="flex items-center justify-between rounded-full px-6 py-3">
        <a href="#" className="text-[16px] font-bold lowercase tracking-tight">
          {site.name}<span className="text-[#0071e3]">.</span>
        </a>
        <nav className="hidden items-center gap-7 text-[13px] font-medium text-[#424245] md:flex">
          {site.nav.map((item) => (
            <a key={item.href} href={item.href} className="transition hover:text-black">
              {item.label}
            </a>
          ))}
        </nav>
        <a
          href="/#contact"
          className="rounded-full bg-[#0071e3] px-5 py-2 text-[13px] font-semibold text-white transition hover:bg-[#0077ed]"
        >
          Contact
        </a>
      </GlassCard>
    </header>
  );
}
