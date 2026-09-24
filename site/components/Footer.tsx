/**
 * Footer — wordmark + copyright line.
 */
import { site } from "../lib/site";
import { footer } from "../lib/content";

export default function Footer() {
  return (
    <footer className="relative border-t border-black/5">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 md:flex-row">
        <span className="font-bold lowercase tracking-tight">
          {site.name}<span className="text-[#0071e3]">.</span>
        </span>
        <span className="text-[12px] font-medium text-[#6e6e73]">
          © {new Date().getFullYear()} — {footer.tagline}
        </span>
      </div>
    </footer>
  );
}
