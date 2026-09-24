/**
 * Site-wide configuration.
 *
 * Single source of truth for brand, contact, and navigation.
 * To rebrand or change the contact email, edit here — nothing else needs to change.
 */
export const site = {
  /** Brand wordmark. Rendered lowercase everywhere by convention. */
  name: "securenowconsulting",
  /** Short descriptor used in metadata and hero eyebrow. */
  tagline: "ServiceNow consultancy",
  /** Public contact address (mailto link in the contact section). */
  email: "hello@securenowconsulting.com",
  /** Public Discord invite for the job-alerts community. */
  discordInvite: "https://discord.gg/uhBgWtWGbJ",
  /** Primary navigation links. Hrefs are root-relative so they work from any page. */
  nav: [
    { label: "Services", href: "/#services" },
    { label: "Work", href: "/#work" },
    { label: "Process", href: "/#process" },
    { label: "Jobs", href: "/jobs" },
  ],
} as const;

export type SiteConfig = typeof site;
