import {
  Zen_Maru_Gothic,
  Noto_Sans_JP,
  Noto_Sans_KR,
  Noto_Sans_SC,
} from "next/font/google";

export const zenMaruGothic = Zen_Maru_Gothic({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-zen-maru-gothic",
  display: "swap",
  preload: true,
});

export const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto-sans-jp",
  display: "swap",
  preload: true,
});

export const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  variable: "--font-noto-sans-kr",
  display: "swap",
  preload: false,
});

export const notoSansSC = Noto_Sans_SC({
  subsets: ["latin"],
  variable: "--font-noto-sans-sc",
  display: "swap",
  preload: false,
});
