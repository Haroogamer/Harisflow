# securenowconsulting — website

ServiceNow consultancy landing page. Next.js (App Router) + Tailwind.
Design language: Apple iOS "Liquid Glass" — frosted translucency, ambient
gradient orbs, pill controls.

## Structure

```
site/                     Standalone Next.js app (this folder)
  package.json            Dependencies (Next 15, React 19, Tailwind v4)
  tsconfig.json           TypeScript config
  next.config.ts          Security headers (see below)
  README.md               This file
  app/
    layout.tsx            Root layout — imports globals.css + glass.css, sets metadata
    globals.css           Tailwind v4 entry point
    glass.css             The Liquid Glass design system (frosted surfaces, keyframes)
    page.tsx              Home page — composition only. No copy, no styling decisions.
    jobs/page.tsx         /jobs landing page — the job-alerts funnel (QR → Discord)
  public/
    qr-discord.png        QR code for the Discord invite. Regenerate if the invite
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
    site.ts               Brand, contact email, Discord invite, nav links — edit here to rebrand
    content.ts            ALL page copy — services, portfolio, process, hero text, /jobs copy
```

## The rule

- **To change what the page *says*** → edit `lib/content.ts` (copy) or
  `lib/site.ts` (brand, email, nav). You should never need to open a component.
- **To change how the page *looks*** → edit the component, or the design
  tokens in `app/glass.css`.
- **`app/page.tsx` is a table of contents.** If you can't tell what the page
  contains from reading it, something is in the wrong file.

## Run locally

```bash
cd site
npm install
npm run dev
```

Open `http://localhost:3000` — and `http://localhost:3000/jobs` for the
job-alerts page.

## Deploy

`site/` is a standard Next.js app. Point Azure's Deployment Center at this
repo and set the app location to `site/` — `npm run build` is verified
working (both routes prerender as static).

Branch workflow: adhoc changes → `dev` → PR into `QA` for review →
`QA` → `main` for the production deploy.

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
