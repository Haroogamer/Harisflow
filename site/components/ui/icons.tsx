/**
 * Shared SVG line icons, keyed by the IconName type in lib/content.ts.
 *
 * To add an icon: add a key here and extend IconName in lib/content.ts.
 */
import type { ReactNode } from "react";
import type { IconName } from "../../lib/content";

const base = "h-7 w-7";

export const icons: Record<IconName, ReactNode> = {
  code: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={base}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
    </svg>
  ),
  integrations: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={base}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V8m0 0L3 12m4-4l4 4m6 4v-8m0 8l-4 4m4-4l4-4" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={base}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M8 17V9m5 8V5m5 12v-6" />
    </svg>
  ),
};
