import { i18n } from "@lingui/core";
import type { Locale } from "@/i18n/types";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/i18n/types";

const STORAGE_KEY = "dw-locale";

const loadCatalog = async (locale: Locale): Promise<void> => {
  const { messages } = await import(`../locales/${locale}/messages.js`);
  i18n.load(locale, messages);
  i18n.activate(locale);
};

export const detectLocale = (): Locale => {
  if (typeof window === "undefined") return DEFAULT_LOCALE;

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored !== null && isSupportedLocale(stored)) return stored;

  const browserLang = navigator.language.slice(0, 2);
  if (isSupportedLocale(browserLang)) return browserLang;

  return DEFAULT_LOCALE;
};

export const saveLocale = (locale: Locale): void => {
  localStorage.setItem(STORAGE_KEY, locale);
  document.documentElement.lang = locale;
};

export const activateLocale = async (locale: Locale): Promise<void> => {
  await loadCatalog(locale);
  saveLocale(locale);
};

export { i18n };
