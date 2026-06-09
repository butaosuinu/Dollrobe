import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/testUtils";
import FeatureShowcase from "./FeatureShowcase";

describe("FeatureShowcase", () => {
  it("セクション見出しと 4 つの機能ユニットが表示される", async () => {
    await renderWithProviders(<FeatureShowcase />);

    expect(
      screen.getByRole("heading", { name: /収納を半自動化する/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "QR を順番にスキャンするだけで、収納を記録",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "どの引き出しに何着あるか、図で見える",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "増えた服も、検索とフィルタですぐ見つかる",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "出しっぱなし・しまいっぱなしを、そっと教えてくれる",
      }),
    ).toBeInTheDocument();
  });

  it("各ユニットに実際の画面スクリーンショットが表示される", async () => {
    await renderWithProviders(<FeatureShowcase />);

    const screenshots: ReadonlyArray<readonly [string, string]> = [
      ["QR スキャン画面のスクリーンショット", "/lp/screenshots/ja/scan.png"],
      [
        "収納グリッド画面のスクリーンショット",
        "/lp/screenshots/ja/locations.png",
      ],
      [
        "ワードローブ画面のスクリーンショット",
        "/lp/screenshots/ja/garments.png",
      ],
      [
        "ダッシュボード画面のスクリーンショット",
        "/lp/screenshots/ja/dashboard.png",
      ],
    ];
    for (const [name, path] of screenshots) {
      expect(screen.getByRole("img", { name })).toHaveAttribute(
        "src",
        expect.stringContaining(path),
      );
    }
  });

  it("補足機能カードが 3 枚表示される", async () => {
    await renderWithProviders(<FeatureShowcase />);

    expect(
      screen.getByRole("heading", { name: "通知は週 1 回だけ" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "インストール不要の PWA" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "オフラインでも見られる" }),
    ).toBeInTheDocument();
  });
});
