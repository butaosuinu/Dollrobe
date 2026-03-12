import type { Metadata, Viewport } from "next";
import "@/app/globals.css";

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
    <body>{children}</body>
  </html>
);

export default RootLayout;
