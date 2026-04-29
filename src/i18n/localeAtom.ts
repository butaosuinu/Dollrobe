import { atom, getDefaultStore } from "jotai";
import type { Locale } from "@/i18n/types";
import { DEFAULT_LOCALE } from "@/i18n/types";
import { activateLocale, detectLocale } from "@/i18n/lingui";

export const localeAtom = atom<Locale>(DEFAULT_LOCALE);

export const localeReadyAtom = atom(async (): Promise<Locale> => {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  const locale = detectLocale();
  await activateLocale(locale);
  getDefaultStore().set(localeAtom, locale);
  return locale;
});

export const setLocaleAtom = atom(
  undefined,
  async (_get, set, locale: Locale) => {
    await activateLocale(locale);
    set(localeAtom, locale);
  },
);
