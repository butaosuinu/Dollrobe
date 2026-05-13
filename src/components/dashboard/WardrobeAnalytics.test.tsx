import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, screen } from "@testing-library/react";
import { i18n } from "@lingui/core";
import { messages as jaMessages } from "@/locales/ja/messages.mjs";
import { messages as enMessages } from "@/locales/en/messages.mjs";
import { messages as koMessages } from "@/locales/ko/messages.mjs";
import { testDb, FIXED_NOW } from "@/test/mocks/db";
import { seedDbFromTestDb } from "@/test/helpers/seedDb";
import { renderWithProviders } from "@/test/testUtils";
import WardrobeAnalytics from "./WardrobeAnalytics";

describe("WardrobeAnalytics", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
    i18n.load({ ja: jaMessages, en: enMessages, ko: koMessages });
    i18n.activate("ja");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    i18n.activate("ja");
  });

  it("locale 切替時にカテゴリラベルが再翻訳される（useMemo 内 i18n._() のキャッシュ回帰防止）", async () => {
    testDb.garment.create({ id: "g-1", category: "onepiece" });
    await seedDbFromTestDb();

    await renderWithProviders(<WardrobeAnalytics />);

    expect(await screen.findByText("ワンピース")).toBeInTheDocument();

    await act(async () => {
      i18n.activate("en");
      await Promise.resolve();
    });

    expect(screen.getByText("One-piece")).toBeInTheDocument();
    expect(screen.queryByText("ワンピース")).not.toBeInTheDocument();

    await act(async () => {
      i18n.activate("ko");
      await Promise.resolve();
    });

    expect(screen.getByText("원피스")).toBeInTheDocument();
    expect(screen.queryByText("One-piece")).not.toBeInTheDocument();
  });
});
