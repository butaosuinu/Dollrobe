import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { server } from "@/test/mocks/server";
import { trpcQuery } from "@/test/mocks/trpc/handlerFactory";
import { renderWithProviders } from "@/test/testUtils";
import type { Digest } from "@/types";
import DigestPage from "./page";

const makeDigest = (overrides: Partial<Digest> = {}): Digest => ({
  id: "digest-1",
  userId: "user-1",
  accuracyScore: 0.82,
  confirmedCount: 10,
  uncertainCount: 3,
  unknownCount: 1,
  totalGarments: 14,
  isRead: false,
  generatedAt: new Date("2026-04-10T00:00:00Z").getTime(),
  createdAt: new Date("2026-04-10T00:00:00Z").getTime(),
  ...overrides,
});

describe("DigestPage", () => {
  it("ヘッダーが表示される", async () => {
    await renderWithProviders(<DigestPage />);
    expect(await screen.findByText("週間レポート")).toBeInTheDocument();
    expect(
      screen.getByText("ワードローブの状況をお伝えします"),
    ).toBeInTheDocument();
  });

  it("digest が空のとき空状態メッセージを表示する", async () => {
    await renderWithProviders(<DigestPage />);
    expect(
      await screen.findByText("まだレポートがありません"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("毎週月曜日に自動生成されます"),
    ).toBeInTheDocument();
  });

  it("digest 一覧が返ると DigestCard が描画される", async () => {
    server.use(trpcQuery("digest.list", () => [makeDigest()]));

    await renderWithProviders(<DigestPage />);

    // accuracyScore 82% は DigestCard 内に表示される
    expect(await screen.findByText(/82/)).toBeInTheDocument();
  });
});
