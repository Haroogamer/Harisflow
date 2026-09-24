/**
 * GlassCard — the Liquid Glass surface used across the site.
 *
 * Variants:
 *   "default" — standard frosted card (nav, stats, services, ticker)
 *   "strong"  — denser frost for emphasis panels (work cards, process, contact)
 *
 * Visual recipe lives in app/glass.css (.snc-glass / .snc-glass-strong).
 * This component only composes classes; it owns no visual constants.
 */
import type { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  variant?: "default" | "strong";
  className?: string;
}

export default function GlassCard({ children, variant = "default", className = "" }: GlassCardProps) {
  const surface = variant === "strong" ? "snc-glass-strong" : "snc-glass";
  return <div className={`${surface} ${className}`}>{children}</div>;
}
