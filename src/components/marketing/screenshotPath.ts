import type { Locale } from "@/i18n/types";

export type ScreenshotName =
  | "dashboard"
  | "garments"
  | "locations"
  | "scan"
  | "digest";

export const screenshotPath = (locale: Locale, name: ScreenshotName): string =>
  `/lp/screenshots/${locale}/${name}.png`;
