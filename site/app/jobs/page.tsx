/**
 * /jobs — the job-alerts landing page.
 *
 * Composition only, same rule as app/page.tsx:
 * copy lives in lib/content.ts, config in lib/site.ts.
 */
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import AmbientBackground from "../../components/AmbientBackground";
import JobsHero from "../../components/JobsHero";
import JobsHowItWorks from "../../components/JobsHowItWorks";
import JobsIncluded from "../../components/JobsIncluded";
import JobsJoin from "../../components/JobsJoin";

export const metadata = {
  title: "Job alerts — securenowconsulting",
  description:
    "Free ServiceNow job alerts, twice a day. Real postings from 2,200+ company career pages, filtered for the US and Canada.",
};

export default function JobsPage() {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#eef1f8] font-sans text-[#1d1d1f] antialiased selection:bg-[#0071e3]/20">
      <AmbientBackground />
      <Navbar />
      <main>
        <JobsHero />
        <JobsHowItWorks />
        <JobsIncluded />
        <JobsJoin />
      </main>
      <Footer />
    </div>
  );
}
