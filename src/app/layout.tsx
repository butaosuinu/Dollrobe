import type { Metadata, Viewport } from "next";
import { zenMaruGothic, notoSansJP } from "@/lib/fonts";
import AppShell from "@/components/layout/AppShell";
import "@/app/globals.css";
import { SerwistProvider } from "@/app/serwist-provider";

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
  <html lang="ja">
    <body className={`${zenMaruGothic.variable} ${notoSansJP.variable}`}>
      <SerwistProvider
        swUrl="/serwist/sw.js"
        disable={process.env.NODE_ENV === "development"}
      >
        <AppShell>{children}</AppShell>
      </SerwistProvider>
    </body>
  </html>
);

export default RootLayout;
