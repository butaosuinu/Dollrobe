import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/testUtils";
import FAQSection from "./FAQSection";

describe("FAQSection", () => {
  it("見出しとすべての質問が表示される", async () => {
    await renderWithProviders(<FAQSection />);

    expect(
      screen.getByRole("heading", { name: "はじめる前の、気になるところ" }),
    ).toBeInTheDocument();
    expect(screen.getByText("iPhone でも使えますか？")).toBeInTheDocument();
    expect(
      screen.getByText("QR ラベルはどうやって用意しますか？"),
    ).toBeInTheDocument();
    expect(screen.getByText("無料で使えますか？")).toBeInTheDocument();
    expect(
      screen.getByText("アプリのインストールは必要ですか？"),
    ).toBeInTheDocument();
    expect(screen.getByText("オフラインでも使えますか？")).toBeInTheDocument();
    expect(
      screen.getByText("通知がたくさん来たりしませんか？"),
    ).toBeInTheDocument();
  });

  it("質問をクリックすると回答が開き、もう一度クリックすると閉じる", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<FAQSection />);

    const answer = screen.getByText(/NFC タッチは Android Chrome のみ/);
    expect(answer).not.toBeVisible();

    await user.click(screen.getByText("iPhone でも使えますか？"));
    expect(answer).toBeVisible();

    await user.click(screen.getByText("iPhone でも使えますか？"));
    expect(answer).not.toBeVisible();
  });

  it("回答にプラットフォームと通知頻度のキー情報が含まれる", async () => {
    await renderWithProviders(<FAQSection />);

    expect(
      screen.getByText(/iPhone \/ Android どちらでも OK/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/週 1 回、月曜の朝のダイジェスト/),
    ).toBeInTheDocument();
    expect(screen.getByText(/ホーム画面に追加すれば/)).toBeInTheDocument();
  });
});
