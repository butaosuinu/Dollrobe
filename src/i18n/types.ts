export type Locale = "ja" | "en" | "ko" | "zh";

export const SUPPORTED_LOCALES = Object.freeze([
  "ja",
  "en",
  "ko",
  "zh",
] as const);

export const DEFAULT_LOCALE: Locale = "ja";

export const LOCALE_DISPLAY_NAME = Object.freeze({
  ja: "日本語",
  en: "English",
  ko: "한국어",
  zh: "中文",
} as const);

export const isSupportedLocale = (value: string): value is Locale =>
  (SUPPORTED_LOCALES as readonly string[]).includes(value);
