import type { Metadata, Viewport } from "next";
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
  themeColor: "#ffffff",
};

const RootLayout = ({ children }: { readonly children: React.ReactNode }) => (
  <html lang="ja">
    <body>
      <SerwistProvider
        swUrl="/serwist/sw.js"
        disable={process.env.NODE_ENV === "development"}
      >
        {children}
      </SerwistProvider>
    </body>
  </html>
);

export default RootLayout;
