/**
 * Root layout — required by the Next.js App Router.
 *
 * Global styles: globals.css (Tailwind) + glass.css (Liquid Glass system).
 * Every page inherits this. Per-page metadata lives in each page.tsx.
 */
import type { Metadata } from "next";
import "./globals.css";
import "./glass.css";

export const metadata: Metadata = {
  title: "securenowconsulting — ServiceNow development, integrations & reporting",
  description:
    "Enterprise ServiceNow, beautifully engineered. Development, integrations, and reporting — plus free ServiceNow job alerts, twice a day.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
