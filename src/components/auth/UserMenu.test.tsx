import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, afterEach } from "vitest";
import { i18n } from "@lingui/core";
import { messages as enMessages } from "@/locales/en/messages.mjs";
import { server } from "@/test/mocks/server";
import { unauthenticatedHandler } from "@/test/mocks/handlers";
import { renderWithProviders } from "@/test/testUtils";
import UserMenu from "./UserMenu";

describe("UserMenu", () => {
  afterEach(() => {
    act(() => {
      i18n.load("ja", {});
      i18n.activate("ja");
    });
  });

  it("認証済みユーザーのイニシャルが表示される", async () => {
    await renderWithProviders(<UserMenu />);

    expect(await screen.findByText("テ")).toBeInTheDocument();
    expect(screen.getByLabelText("ログアウト")).toBeInTheDocument();
  });

  it("未認証時はログインリンクが表示される", async () => {
    server.use(unauthenticatedHandler);
    await renderWithProviders(<UserMenu />);

    await waitFor(() => {
      expect(screen.queryByTestId("suspense-loading")).not.toBeInTheDocument();
    });

    const loginLink = await screen.findByRole("link", { name: "ログイン" });
    expect(loginLink).toHaveAttribute("href", "/signin");
  });

  it("ログアウトボタン押下で確認モーダルが開く", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<UserMenu />);

    await user.click(await screen.findByLabelText("ログアウト"));

    expect(
      await screen.findByRole("heading", { name: "ログアウトしますか？" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "再びログインするまで、収納場所の確認や服の登録ができなくなります。",
      ),
    ).toBeInTheDocument();
  });

  it("確認モーダルのキャンセルでモーダルが閉じる", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<UserMenu />);

    await user.click(await screen.findByLabelText("ログアウト"));
    await screen.findByRole("heading", { name: "ログアウトしますか？" });
    await user.click(await screen.findByRole("button", { name: "キャンセル" }));

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "ログアウトしますか？" }),
      ).toBeNull();
    });
  });

  it("確認モーダルでログアウト確定するとモーダルが閉じる", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<UserMenu />);

    await user.click(await screen.findByLabelText("ログアウト"));
    const confirmButtons = await screen.findAllByRole("button", {
      name: "ログアウト",
    });
    await user.click(confirmButtons[confirmButtons.length - 1]!);

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "ログアウトしますか？" }),
      ).toBeNull();
    });
  });

  it("locale を en に切替えると設定リンクの aria-label が Settings になる", async () => {
    await renderWithProviders(<UserMenu />);

    expect(await screen.findByLabelText("設定")).toBeInTheDocument();

    act(() => {
      i18n.load("en", enMessages);
      i18n.activate("en");
    });

    expect(await screen.findByLabelText("Settings")).toBeInTheDocument();
  });
});
