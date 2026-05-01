import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Locale } from "@/i18n/types";
import { renderWithProviders } from "@/test/testUtils";
import LocaleSelector from "./LocaleSelector";

const mockSetLocale = vi.hoisted(() => vi.fn());

vi.mock("@/i18n/localeAtom", async () => {
  const { atom } = await vi.importActual<typeof import("jotai")>("jotai");
  const { DEFAULT_LOCALE } =
    await vi.importActual<typeof import("@/i18n/types")>("@/i18n/types");
  return {
    localeAtom: atom<Locale>(DEFAULT_LOCALE),
    setLocaleAtom: atom(undefined, (_get, _set, locale: Locale) => {
      mockSetLocale(locale);
    }),
  };
});

describe("LocaleSelector", () => {
  beforeEach(() => {
    mockSetLocale.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("初期状態ではメニューが閉じている", async () => {
    await renderWithProviders(<LocaleSelector />);

    expect(screen.getByRole("button", { name: "言語" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "日本語" }),
    ).not.toBeInTheDocument();
  });

  it("言語ボタンをクリックするとメニューが開く", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<LocaleSelector />);

    await user.click(screen.getByRole("button", { name: "言語" }));

    expect(screen.getByRole("button", { name: "日本語" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "English" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "한국어" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "中文" })).toBeInTheDocument();
  });

  it("もう一度クリックするとメニューが閉じる", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<LocaleSelector />);

    const trigger = screen.getByRole("button", { name: "言語" });
    await user.click(trigger);
    expect(screen.getByRole("button", { name: "日本語" })).toBeInTheDocument();

    await user.click(trigger);

    expect(
      screen.queryByRole("button", { name: "日本語" }),
    ).not.toBeInTheDocument();
  });

  it("外側の領域を pointerdown でクリックするとメニューが閉じる", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<LocaleSelector />);

    await user.click(screen.getByRole("button", { name: "言語" }));
    expect(screen.getByRole("button", { name: "English" })).toBeInTheDocument();

    const outsideEvent = new PointerEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      document.body.dispatchEvent(outsideEvent);
    });

    expect(
      screen.queryByRole("button", { name: "English" }),
    ).not.toBeInTheDocument();
  });

  it("各 locale 選択で setLocale が呼ばれメニューが閉じる", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<LocaleSelector />);

    await user.click(screen.getByRole("button", { name: "言語" }));
    await user.click(screen.getByRole("button", { name: "English" }));

    expect(mockSetLocale).toHaveBeenCalledWith("en");
    expect(
      screen.queryByRole("button", { name: "English" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "言語" }));
    await user.click(screen.getByRole("button", { name: "한국어" }));
    expect(mockSetLocale).toHaveBeenCalledWith("ko");

    await user.click(screen.getByRole("button", { name: "言語" }));
    await user.click(screen.getByRole("button", { name: "中文" }));
    expect(mockSetLocale).toHaveBeenCalledWith("zh");

    await user.click(screen.getByRole("button", { name: "言語" }));
    await user.click(screen.getByRole("button", { name: "日本語" }));
    expect(mockSetLocale).toHaveBeenCalledWith("ja");

    expect(mockSetLocale).toHaveBeenCalledTimes(4);
  });
});
