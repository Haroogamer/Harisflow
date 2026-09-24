# securenowconsulting — website

ServiceNow consultancy landing page. Next.js (App Router) + Tailwind.
Design language: Apple iOS "Liquid Glass" — frosted translucency, ambient
gradient orbs, pill controls.

## Structure

```
app/
  page.tsx        Home page — composition only. No copy, no styling decisions.
  jobs/page.tsx   /jobs landing page — the job-alerts funnel (QR → Discord).
  glass.css       The Liquid Glass design system (frosted surfaces, keyframes).
                  Import once in the root layout:  import "./glass.css";
public/
  qr-discord.png  QR code for the Discord invite. Regenerate if the invite
                  link (lib/site.ts → discordInvite) ever changes.
components/
  Navbar.tsx, Hero.tsx, CapabilityTicker.tsx,
  Services.tsx, Work.tsx, Process.tsx,
  Contact.tsx, Footer.tsx, AmbientBackground.tsx,
  JobsHero.tsx, JobsHowItWorks.tsx, JobsIncluded.tsx, JobsJoin.tsx
  ui/
    GlassCard.tsx       Frosted surface wrapper (variants: default | strong)
    SectionHeading.tsx  Eyebrow + title block shared by all sections
    icons.tsx           SVG line icons, keyed by IconName
lib/
  site.ts         Brand, contact email, Discord invite, nav links — edit here to rebrand
  content.ts      ALL page copy — services, portfolio, process, hero text, /jobs copy
next.config.ts    Security headers (see below)
```

## The rule

- **To change what the page *says*** → edit `lib/content.ts` (copy) or
  `lib/site.ts` (brand, email, nav). You should never need to open a component.
- **To change how the page *looks*** → edit the component, or the design
  tokens in `app/glass.css`.
- **`app/page.tsx` is a table of contents.** If you can't tell what the page
  contains from reading it, something is in the wrong file.

## Integrating into the existing project

The live site is a standard Create Next App project. To deploy this:

1. Copy `app/`, `components/`, `lib/` into the project (replace `app/page.tsx`).
2. In the root layout (`app/layout.tsx`), add next to the globals.css import:
   `import "./glass.css";`
3. Set the metadata title/description in `app/layout.tsx`:
   `title: "securenowconsulting — ServiceNow development, integrations & reporting"`
4. Merge `next.config.ts` — if one already exists, copy the `securityHeaders`
   array and `headers()` into it instead of replacing the file.
5. Push. The Azure pipeline redeploys.

## Security notes

Threat model: this is a fully static marketing page. There are no forms, no
user input, no API routes, no cookies, no secrets, and no environment
variables. The only outbound action is a `mailto:` link. Attack surface is
essentially the HTTP response itself, which is why the headers below matter.

- **Security headers** (`next.config.ts`): nosniff, DENY framing, strict
  referrer policy, camera/mic/geolocation/payment disabled, HSTS (2 years),
  and a Content-Security-Policy locked to `'self'`.
- **CSP maintenance:** the policy allows `'unsafe-inline'` for styles
  (Tailwind + glass.css keyframes). If you add analytics, fonts, or embeds
  later, extend the policy for those origins — don't delete it.
- **No secrets policy:** never add API keys, tokens, or connection strings to
  this project. If a future feature needs a secret, it belongs in Azure App
  Settings / Key Vault, referenced server-side only.
- **Dependencies:** keep them minimal. Every new dependency is a supply-chain
  entry point — this page currently needs nothing beyond Next.js + Tailwind.

## Accessibility

- Decorative layers (gradient orbs) are `aria-hidden` and pointer-transparent.
- Animations respect `prefers-reduced-motion` (see `app/glass.css`).
- Color contrast targets WCAG AA for body text (#6e6e73 on light frost).
