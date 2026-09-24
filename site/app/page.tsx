/**
 * Home page — composition only.
 *
 * This file intentionally contains no copy and no styling decisions.
 * To change what the page SAYS, edit lib/content.ts / lib/site.ts.
 * To change how it LOOKS, edit the component files or app/glass.css.
 */
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import CapabilityTicker from "../components/CapabilityTicker";
import Services from "../components/Services";
import Work from "../components/Work";
import Process from "../components/Process";
import Contact from "../components/Contact";
import Footer from "../components/Footer";
import AmbientBackground from "../components/AmbientBackground";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#eef1f8] font-sans text-[#1d1d1f] antialiased selection:bg-[#0071e3]/20">
      <AmbientBackground />
      <Navbar />
      <main>
        <Hero />
        <CapabilityTicker />
        <Services />
        <Work />
        <Process />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
