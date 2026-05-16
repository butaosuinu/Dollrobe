import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "@/test/mocks/server";
import { unauthenticatedHandler } from "@/test/mocks/handlers";
import { renderWithProviders } from "@/test/testUtils";
import { setupNextNavigation } from "@/test/mocks/modules/nextNavigation";
import { setupAuthClient } from "@/test/mocks/modules/authClient";
import SignUpPage from "./page";

describe("SignUpPage", () => {
  beforeEach(() => {
    setupNextNavigation();
    setupAuthClient();
  });

  it("未認証時に登録フォームと OAuth ボタンが表示される", async () => {
    server.use(unauthenticatedHandler);

    await renderWithProviders(<SignUpPage />);

    expect(await screen.findByLabelText("表示名")).toBeInTheDocument();
    expect(screen.getByLabelText("メールアドレス")).toBeInTheDocument();
    expect(screen.getByLabelText("パスワード")).toBeInTheDocument();
    expect(screen.getByLabelText("パスワード（確認）")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "アカウント作成" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Google でログイン" }),
    ).toBeInTheDocument();
  });

  it("サインインへのリンクが表示される", async () => {
    server.use(unauthenticatedHandler);

    await renderWithProviders(<SignUpPage />);

    const link = await screen.findByRole("link", { name: "ログイン" });
    expect(link).toHaveAttribute("href", "/signin");
  });

  it("正しい入力で送信すると signUpWithEmail が呼ばれホームへ遷移する", async () => {
    server.use(unauthenticatedHandler);
    const { spies } = setupAuthClient();
    const { router } = setupNextNavigation();

    const user = userEvent.setup();
    await renderWithProviders(<SignUpPage />);

    await user.type(await screen.findByLabelText("表示名"), "佐藤");
    await user.type(screen.getByLabelText("メールアドレス"), "new@example.com");
    await user.type(screen.getByLabelText("パスワード"), "secret123");
    await user.type(screen.getByLabelText("パスワード（確認）"), "secret123");
    await user.click(screen.getByRole("button", { name: "アカウント作成" }));

    await waitFor(() => {
      expect(spies.signUpWithEmail).toHaveBeenCalledWith({
        name: "佐藤",
        email: "new@example.com",
        password: "secret123",
      });
    });
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/");
    });
  });

  it("空のまま送信すると各フィールドに日本語バリデーションメッセージが表示される", async () => {
    server.use(unauthenticatedHandler);
    const { spies } = setupAuthClient();

    const user = userEvent.setup();
    await renderWithProviders(<SignUpPage />);

    await user.click(
      await screen.findByRole("button", { name: "アカウント作成" }),
    );

    expect(spies.signUpWithEmail).not.toHaveBeenCalled();
    expect(
      await screen.findByText("表示名を入力してください"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("正しいメールアドレスを入力してください"),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("パスワードは 8 文字以上で入力してください").length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("パスワード不一致でバリデーションエラーが表示され送信されない", async () => {
    server.use(unauthenticatedHandler);
    const { spies } = setupAuthClient();

    const user = userEvent.setup();
    await renderWithProviders(<SignUpPage />);

    await user.type(await screen.findByLabelText("表示名"), "佐藤");
    await user.type(screen.getByLabelText("メールアドレス"), "new@example.com");
    await user.type(screen.getByLabelText("パスワード"), "secret123");
    await user.type(screen.getByLabelText("パスワード（確認）"), "different1");
    await user.click(screen.getByRole("button", { name: "アカウント作成" }));

    expect(spies.signUpWithEmail).not.toHaveBeenCalled();
    expect(
      await screen.findByText("パスワードが一致しません"),
    ).toBeInTheDocument();
  });

  it("サインアップ失敗時にエラーバナーが表示される", async () => {
    server.use(unauthenticatedHandler);
    setupAuthClient({ signUpShouldFail: true });

    const user = userEvent.setup();
    await renderWithProviders(<SignUpPage />);

    await user.type(await screen.findByLabelText("表示名"), "佐藤");
    await user.type(
      screen.getByLabelText("メールアドレス"),
      "exists@example.com",
    );
    await user.type(screen.getByLabelText("パスワード"), "secret123");
    await user.type(screen.getByLabelText("パスワード（確認）"), "secret123");
    await user.click(screen.getByRole("button", { name: "アカウント作成" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "アカウントを作成できませんでした",
    );
  });

  it("認証済みの場合はホームへリダイレクトされる", async () => {
    const { router } = setupNextNavigation();

    await renderWithProviders(<SignUpPage />);

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/");
    });
  });

  it("メールアドレス形式が不正な場合はバリデーションエラーで送信されない", async () => {
    server.use(unauthenticatedHandler);
    const { spies } = setupAuthClient();

    const user = userEvent.setup();
    await renderWithProviders(<SignUpPage />);

    await user.type(await screen.findByLabelText("表示名"), "佐藤");
    await user.type(screen.getByLabelText("メールアドレス"), "not-email");
    await user.type(screen.getByLabelText("パスワード"), "secret123");
    await user.type(screen.getByLabelText("パスワード（確認）"), "secret123");
    await user.click(screen.getByRole("button", { name: "アカウント作成" }));

    await waitFor(() => {
      expect(spies.signUpWithEmail).not.toHaveBeenCalled();
    });
  });

  it("名前未入力でバリデーションエラーになる", async () => {
    server.use(unauthenticatedHandler);
    const { spies } = setupAuthClient();

    const user = userEvent.setup();
    await renderWithProviders(<SignUpPage />);

    await user.type(
      await screen.findByLabelText("メールアドレス"),
      "ok@example.com",
    );
    await user.type(screen.getByLabelText("パスワード"), "secret123");
    await user.type(screen.getByLabelText("パスワード（確認）"), "secret123");
    await user.click(screen.getByRole("button", { name: "アカウント作成" }));

    await waitFor(() => {
      expect(spies.signUpWithEmail).not.toHaveBeenCalled();
    });
  });
});
