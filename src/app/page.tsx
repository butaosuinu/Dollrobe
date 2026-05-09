import type { Metadata } from "next";
import Hero from "@/components/marketing/Hero";
import ProblemSection from "@/components/marketing/ProblemSection";
import FeatureGrid from "@/components/marketing/FeatureGrid";
import StepsSection from "@/components/marketing/StepsSection";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import LandingAuthRedirect from "@/components/marketing/LandingAuthRedirect";

/* eslint-disable lingui/no-unlocalized-strings -- OG/Twitter metadata is static
   ja_JP; per-locale variants would need full SSR routing which is out of scope */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "";
const OG_TITLE = "Dollrobe — ドール服が、どこにあるか分かる";
const OG_DESCRIPTION =
  "QR と NFC でドール服の収納を半自動管理する PWA。手入力なし、スキャンするだけで在庫が最新に。";

export const generateMetadata = (): Metadata => ({
  title: OG_TITLE,
  description: OG_DESCRIPTION,
  metadataBase: SITE_URL === "" ? undefined : new URL(SITE_URL),
  openGraph: {
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    siteName: "Dollrobe",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: OG_TITLE,
    description: OG_DESCRIPTION,
  },
});
/* eslint-enable lingui/no-unlocalized-strings */

const LandingPage = () => (
  <>
    <LandingAuthRedirect />
    <MarketingHeader />
    <main>
      <Hero />
      <ProblemSection />
      <FeatureGrid />
      <StepsSection />
    </main>
    <MarketingFooter />
  </>
);

export default LandingPage;
