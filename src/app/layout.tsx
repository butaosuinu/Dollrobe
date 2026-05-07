import type { Metadata, Viewport } from "next";
import { zenMaruGothic, notoSansJP, notoSansKR, notoSansSC } from "@/lib/fonts";
import AppShell from "@/components/layout/AppShell";
import RequireAuth from "@/components/auth/RequireAuth";
import "@/app/globals.css";
import { SerwistProvider } from "@/app/serwist-provider";
import LinguiClientProvider from "@/components/i18n/LinguiProvider";

export const metadata: Metadata = {
  title: "Doll Wardrobe",
  description: "ドール服管理システム",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
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
          <RequireAuth>
            <AppShell>{children}</AppShell>
          </RequireAuth>
        </LinguiClientProvider>
      </SerwistProvider>
    </body>
  </html>
);

export default RootLayout;
