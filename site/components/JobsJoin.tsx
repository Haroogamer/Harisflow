/**
 * JobsJoin — the QR code panel. Scan to join the Discord.
 * Invite link lives in lib/site.ts (discordInvite); copy in lib/content.ts (jobsJoin).
 * QR image: public/qr-discord.png (regenerate if the invite link ever changes).
 */
import { site } from "../lib/site";
import { jobsJoin } from "../lib/content";
import GlassCard from "./ui/GlassCard";

export default function JobsJoin() {
  return (
    <section className="relative mx-auto max-w-4xl px-6 pb-28">
      <GlassCard variant="strong" className="relative overflow-hidden rounded-[36px] p-12 text-center md:p-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-300/50 via-violet-300/50 to-pink-300/50 blur-[80px]"
        />
        <div className="relative">
          <h2 className="text-4xl font-semibold tracking-tight md:text-5xl">
            {jobsJoin.headingTop}{" "}
            <span className="italic text-[#0071e3]">{jobsJoin.headingAccent}</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-[#6e6e73]">{jobsJoin.body}</p>

          <div className="mx-auto mt-10 w-fit rounded-[28px] bg-white p-5 shadow-[0_12px_40px_rgba(31,38,135,0.15)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/qr-discord.png"
              alt="QR code to join the securenowconsulting Discord server"
              width={240}
              height={240}
              className="h-60 w-60"
            />
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a
              href={site.discordInvite}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-[#0071e3] px-8 py-3.5 font-semibold text-white shadow-[0_8px_24px_rgba(0,113,227,0.35)] transition hover:bg-[#0077ed]"
            >
              {jobsJoin.openLinkLabel}
            </a>
          </div>
          <p className="mt-6 font-mono text-[12px] text-[#6e6e73]">{site.discordInvite}</p>
          <p className="mt-2 text-[13px] text-[#6e6e73]">{jobsJoin.note}</p>
        </div>
      </GlassCard>
    </section>
  );
}
