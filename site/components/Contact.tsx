/**
 * Contact — the closing call-to-action panel.
 * Email address comes from lib/site.ts; headline/body from lib/content.ts (contact).
 */
import { site } from "../lib/site";
import { contact } from "../lib/content";
import GlassCard from "./ui/GlassCard";

export default function Contact() {
  return (
    <section id="contact" className="relative mx-auto max-w-4xl scroll-mt-28 px-6 pb-28">
      <GlassCard variant="strong" className="relative overflow-hidden rounded-[36px] p-12 text-center md:p-20">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-300/50 via-violet-300/50 to-pink-300/50 blur-[80px]"
        />
        <div className="relative">
          <h2 className="text-4xl font-semibold tracking-tight md:text-6xl">
            {contact.headingTop}{" "}
            <span className="italic text-[#0071e3]">{contact.headingAccent}</span>{" "}
            {contact.headingBottom}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-[#6e6e73]">{contact.body}</p>
          <a
            href={`mailto:${site.email}`}
            className="mt-9 inline-block rounded-full bg-[#0071e3] px-10 py-4 text-lg font-semibold text-white shadow-[0_10px_30px_rgba(0,113,227,0.4)] transition hover:bg-[#0077ed]"
          >
            {site.email}
          </a>
        </div>
      </GlassCard>
    </section>
  );
}
