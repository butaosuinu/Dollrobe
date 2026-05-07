import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "@/test/mocks/server";
import { unauthenticatedHandler } from "@/test/mocks/handlers";
import { renderWithProviders } from "@/test/testUtils";
import { setupNextNavigation } from "@/test/mocks/modules/nextNavigation";
import { setupAuthClient } from "@/test/mocks/modules/authClient";
import SignInPage from "./page";

describe("SignInPage", () => {
  beforeEach(() => {
    setupNextNavigation();
    setupAuthClient();
  });

  it("未認証時に Twitter / Google のログインボタンが表示される", async () => {
    server.use(unauthenticatedHandler);

    await renderWithProviders(<SignInPage />);

    expect(
      await screen.findByRole("button", { name: "X (Twitter) でログイン" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Google でログイン" }),
    ).toBeInTheDocument();
  });

  it("メールアドレスとパスワードのフォームが表示される", async () => {
    server.use(unauthenticatedHandler);

    await renderWithProviders(<SignInPage />);

    expect(await screen.findByLabelText("メールアドレス")).toBeInTheDocument();
    expect(screen.getByLabelText("パスワード")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "ログイン" }),
    ).toBeInTheDocument();
  });

  it("サインアップへのリンクが表示される", async () => {
    server.use(unauthenticatedHandler);

    await renderWithProviders(<SignInPage />);

    const link = await screen.findByRole("link", { name: "新規登録" });
    expect(link).toHaveAttribute("href", "/signup");
  });

  it("メールとパスワードを入力して送信すると signInWithEmail が呼ばれる", async () => {
    server.use(unauthenticatedHandler);
    const { spies } = setupAuthClient();
    const { router } = setupNextNavigation();

    const user = userEvent.setup();
    await renderWithProviders(<SignInPage />);

    await user.type(
      await screen.findByLabelText("メールアドレス"),
      "user@example.com",
    );
    await user.type(screen.getByLabelText("パスワード"), "secret123");
    await user.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => {
      expect(spies.signInWithEmail).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "secret123",
      });
    });
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/");
    });
  });

  it("ログイン失敗時にエラーバナーが表示される", async () => {
    server.use(unauthenticatedHandler);
    setupAuthClient({ signInShouldFail: true });

    const user = userEvent.setup();
    await renderWithProviders(<SignInPage />);

    await user.type(
      await screen.findByLabelText("メールアドレス"),
      "user@example.com",
    );
    await user.type(screen.getByLabelText("パスワード"), "wrongpass");
    await user.click(screen.getByRole("button", { name: "ログイン" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "メールアドレスまたはパスワードが正しくありません",
    );
  });

  it("認証済みの場合はホームへリダイレクトされる", async () => {
    const { router } = setupNextNavigation();

    await renderWithProviders(<SignInPage />);

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/");
    });
  });

  it("認証済みで ?redirect=/dashboard が指定されているとき /dashboard へリダイレクトする", async () => {
    const { router } = setupNextNavigation({
      searchParams: new URLSearchParams("redirect=/dashboard"),
    });

    await renderWithProviders(<SignInPage />);

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("? redirect=// で始まる open redirect は弾かれてデフォルト / にフォールバック", async () => {
    const { router } = setupNextNavigation({
      searchParams: new URLSearchParams("redirect=//evil.example.com/bad"),
    });

    await renderWithProviders(<SignInPage />);

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/");
    });
  });

  it("「← サービス紹介に戻る」リンクが / を指す", async () => {
    server.use(unauthenticatedHandler);

    await renderWithProviders(<SignInPage />);

    const link = await screen.findByRole("link", {
      name: /サービス紹介に戻る/,
    });
    expect(link).toHaveAttribute("href", "/");
  });
});
