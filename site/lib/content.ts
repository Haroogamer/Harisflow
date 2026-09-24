/**
 * All page copy lives here.
 *
 * A developer updating text, services, or portfolio items should never need
 * to open a component file. Edit the data below; the components render it.
 */

export type IconName = "code" | "integrations" | "chart";

export interface Service {
  icon: IconName;
  title: string;
  desc: string;
  tags: string[];
  /** Tailwind gradient + text tint for the icon chip, e.g. "from-blue-400/30 to-blue-600/10 text-blue-600" */
  tint: string;
}

export interface Build {
  title: string;
  desc: string;
}

export interface ProcessStep {
  title: string;
  desc: string;
}

export const hero = {
  badge: "Accepting new projects",
  titleTop: "ServiceNow,",
  titleBottom: "beautifully engineered.",
  subtitle:
    "Development, integrations, and reporting on the ServiceNow platform — crafted with the care of a product team, delivered with the focus of a specialist.",
  primaryCta: { label: "Start a project", href: "#contact" },
  secondaryCta: { label: "See the work", href: "#work" },
  stats: [
    { value: "03", label: "core practices" },
    { value: "48h", label: "response time" },
    { value: "100%", label: "documented handoff" },
  ] as { value: string; label: string }[],
};

export const capabilities: string[] = [
  "Business Rules",
  "Script Includes",
  "REST Integrations",
  "Flow Designer",
  "ACLs",
  "Service Portal",
  "Client Scripts",
  "UI Policies",
  "Scoped Apps",
  "OAuth",
  "Update Sets",
  "Performance Analytics",
];

export const services: Service[] = [
  {
    icon: "code",
    title: "Platform development",
    desc: "Scoped applications and server-side scripting built the way the platform wants to be built. Clean update sets, no technical debt passed on as your problem.",
    tags: ["Scoped apps", "Business rules", "Service Portal"],
    tint: "from-blue-400/30 to-blue-600/10 text-blue-600",
  },
  {
    icon: "integrations",
    title: "Integrations",
    desc: "ServiceNow as part of your stack, not an island. REST APIs, secure OAuth, Azure services, and agent flows across Copilot Studio and Power Automate.",
    tags: ["REST / SOAP", "OAuth", "Copilot Studio"],
    tint: "from-violet-400/30 to-violet-600/10 text-violet-600",
  },
  {
    icon: "chart",
    title: "Reporting & analytics",
    desc: "Custom reports, dashboards, and Performance Analytics that answer the question your stakeholders actually asked.",
    tags: ["Custom reports", "Dashboards", "PA"],
    tint: "from-emerald-400/30 to-emerald-600/10 text-emerald-600",
  },
];

export const builds: Build[] = [
  {
    title: "Developer investigation API",
    desc: "Read-only investigation layer over the ServiceNow platform — field lineage, business-rule history, and full table introspection behind a gated role. Built for a secure enterprise deployment.",
  },
  {
    title: "Risk reporting suite",
    desc: "Override-aware TPRM reporting: assessor ratings surfaced where they exist, computed ratings everywhere else — one consistent pattern across every risk column.",
  },
  {
    title: "Automation tooling",
    desc: "Python-based intelligence pipeline — concurrent API harvesting, SQLite dedupe, CI/CD on a schedule. The kind of glue work that saves a hire.",
  },
];

export const processSteps: ProcessStep[] = [
  {
    title: "Scope",
    desc: "A working session to define done — in writing — before anything starts. Fixed scope, fixed timeline.",
  },
  {
    title: "Build",
    desc: "Development with written updates on a fixed cadence. You watch progress happen, not the reveal.",
  },
  {
    title: "Transfer",
    desc: "Clean update sets, documentation, and a walkthrough. Your team owns it from day one.",
  },
];

export const contact = {
  headingTop: "Bring the",
  headingAccent: "hard",
  headingBottom: "problem.",
  body: "Messy instance, failed handoff, integration nobody wants to touch. One business day response — and honest scoping, even if the answer is you don't need me.",
};

export const footer = {
  tagline: "ServiceNow development · integrations · reporting",
};

/* ------------------------------ /jobs page ------------------------------ */

export const jobsHero = {
  eyebrow: "Job alerts",
  titleTop: "Need help",
  titleBottom: "finding a job?",
  subtitle:
    "Free ServiceNow job alerts, twice a day. Real postings pulled from 2,200+ company career pages — filtered for developers, admins, and analysts across the US and Canada.",
  primaryCta: { label: "Join the Discord" },
  secondaryCta: { label: "How it works", href: "#how-it-works" },
  stats: [
    { value: "2,200+", label: "company boards scanned" },
    { value: "2x", label: "alert drops daily" },
    { value: "0", label: "spam or recruiter noise" },
  ] as { value: string; label: string }[],
};

export const jobsSteps: ProcessStep[] = [
  {
    title: "Scan & join",
    desc: "Point your camera at the QR code and join the Discord server. Takes about thirty seconds.",
  },
  {
    title: "Request access",
    desc: "Ask for access to the job-alerts channel. It's gated so the feed stays clean and relevant.",
  },
  {
    title: "Get alerts",
    desc: "Fresh matches drop twice daily, around 8am and 6pm ET. See a fit? Apply within 24 hours.",
  },
];

export const jobsIncluded = {
  eyebrow: "What you get",
  titleTop: "Curated matches.",
  titleBottom: "Not scraped spam.",
  items: [
    {
      title: "Genuine ServiceNow roles",
      desc: "Every posting passes a real relevance filter — actual platform work, not a keyword mentioned in passing.",
    },
    {
      title: "US + Canada, no clearance roles",
      desc: "Filtered to commercial roles you can actually apply for. No clearance-gated or federal postings.",
    },
    {
      title: "Apply-ready details",
      desc: "Company, title, location, and a direct link to the posting. No aggregator maze, no dead links.",
    },
    {
      title: "Twice-daily drops",
      desc: "New matches land around 8am and 6pm ET — early enough to be first in line, not last.",
    },
  ] as { title: string; desc: string }[],
};

export const jobsJoin = {
  headingTop: "Scan to",
  headingAccent: "join.",
  body: "Point your camera at the code. Once you're in the server, request access to job alerts and you're set — free, no catch.",
  openLinkLabel: "Open invite link",
  note: "Free forever. If the code ever expires, the link above always works.",
};
