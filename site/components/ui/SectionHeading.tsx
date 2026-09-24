/**
 * SectionHeading — consistent eyebrow + title block for every section.
 */
import type { ReactNode } from "react";

interface SectionHeadingProps {
  eyebrow: string;
  children: ReactNode;
  centered?: boolean;
}

export default function SectionHeading({ eyebrow, children, centered = true }: SectionHeadingProps) {
  return (
    <div className={centered ? "text-center" : "text-left"}>
      <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-[#0071e3]">{eyebrow}</p>
      <h2 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">{children}</h2>
    </div>
  );
}
