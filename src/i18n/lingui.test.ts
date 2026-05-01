import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import type { Locale } from "@/i18n/types";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@/i18n/types";
import { activateLocale, detectLocale, saveLocale } from "@/i18n/lingui";

const STORAGE_KEY = "dw-locale";

vi.mock("../locales/ja/messages.mjs", () => ({ messages: {} }));
vi.mock("../locales/en/messages.mjs", () => ({ messages: {} }));
vi.mock("../locales/ko/messages.mjs", () => ({ messages: {} }));
vi.mock("../locales/zh/messages.mjs", () => ({ messages: {} }));

const resetLocaleEnv = () => {
  localStorage.clear();
  document.documentElement.lang = "";
};

describe("detectLocale", () => {
  beforeEach(resetLocaleEnv);

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("window が undefined の場合は DEFAULT_LOCALE を返す", () => {
    vi.stubGlobal("window", undefined);
    expect(detectLocale()).toBe(DEFAULT_LOCALE);
  });

  it("localStorage に正常な locale が保存されている場合はそれを返す", () => {
    localStorage.setItem(STORAGE_KEY, "en");
    expect(detectLocale()).toBe("en");
  });

  it("localStorage に不正な locale が保存されている場合は navigator.language にフォールバックする", () => {
    localStorage.setItem(STORAGE_KEY, "fr");
    vi.spyOn(navigator, "language", "get").mockReturnValue("ko-KR");
    expect(detectLocale()).toBe("ko");
  });

  it("localStorage が空で navigator.language が対応 locale の場合はそれを返す", () => {
    vi.spyOn(navigator, "language", "get").mockReturnValue("zh-CN");
    expect(detectLocale()).toBe("zh");
  });

  it("localStorage が空で navigator.language が未対応 locale の場合は DEFAULT_LOCALE を返す", () => {
    vi.spyOn(navigator, "language", "get").mockReturnValue("fr-FR");
    expect(detectLocale()).toBe(DEFAULT_LOCALE);
  });
});

describe("saveLocale", () => {
  beforeEach(resetLocaleEnv);

  it.each(SUPPORTED_LOCALES)(
    "%s を localStorage と html lang に保存する",
    (locale: Locale) => {
      saveLocale(locale);
      expect(localStorage.getItem(STORAGE_KEY)).toBe(locale);
      expect(document.documentElement.lang).toBe(locale);
    },
  );
});

describe("activateLocale", () => {
  beforeEach(resetLocaleEnv);

  it.each(SUPPORTED_LOCALES)(
    "%s の catalog をロードして activate する",
    async (locale: Locale) => {
      await activateLocale(locale);
      expect(i18n.locale).toBe(locale);
      expect(localStorage.getItem(STORAGE_KEY)).toBe(locale);
      expect(document.documentElement.lang).toBe(locale);
    },
  );
});
