import { atom } from "jotai";
import type { Locale } from "@/i18n/types";
import { DEFAULT_LOCALE } from "@/i18n/types";
import { activateLocale, detectLocale } from "@/i18n/lingui";

export const localeAtom = atom<Locale>(DEFAULT_LOCALE);

export const initLocaleAtom = atom(undefined, async (_get, set) => {
  const locale = detectLocale();
  await activateLocale(locale);
  set(localeAtom, locale);
});

export const setLocaleAtom = atom(
  undefined,
  async (_get, set, locale: Locale) => {
    await activateLocale(locale);
    set(localeAtom, locale);
  },
);
