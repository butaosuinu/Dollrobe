import type { Metadata, Viewport } from "next";
import { zenMaruGothic, notoSansJP, notoSansKR, notoSansSC } from "@/lib/fonts";
import AppShell from "@/components/layout/AppShell";
import "@/app/globals.css";
import { SerwistProvider } from "@/app/serwist-provider";
import LinguiClientProvider from "@/components/i18n/LinguiProvider";

export const metadata: Metadata = {
  title: "Doll Wardrobe",
  description: "ドール服管理システム",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f2e8eb",
};

export const dynamic = "force-dynamic";

const RootLayout = ({ children }: { readonly children: React.ReactNode }) => (
  <html lang="ja" suppressHydrationWarning>
    <body
      className={`${zenMaruGothic.variable} ${notoSansJP.variable} ${notoSansKR.variable} ${notoSansSC.variable}`}
    >
      <SerwistProvider
        swUrl="/serwist/sw.js"
        disable={process.env.NODE_ENV === "development"}
      >
        <LinguiClientProvider>
          <AppShell>{children}</AppShell>
        </LinguiClientProvider>
      </SerwistProvider>
    </body>
  </html>
);

export default RootLayout;
