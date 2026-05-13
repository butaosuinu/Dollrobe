/* eslint-disable max-lines -- many account-settings integration scenarios */
import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/mocks/server";
import { unauthenticatedHandler } from "@/test/mocks/handlers";
import { renderWithProviders } from "@/test/testUtils";
import { setupNextNavigation } from "@/test/mocks/modules/nextNavigation";
import { setupAuthClient } from "@/test/mocks/modules/authClient";
import AccountSettingsPage from "./page";

describe("AccountSettingsPage", () => {
  beforeEach(() => {
    setupNextNavigation();
    setupAuthClient();
  });

  it("4 セクションすべてが表示される", async () => {
    await renderWithProviders(<AccountSettingsPage />);

    expect(
      await screen.findByRole("heading", { name: "プロフィール" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "メールアドレス" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "パスワード" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "アカウントを削除" }),
    ).toBeInTheDocument();
  });

  it("プロフィールフォームに現在の値が表示される", async () => {
    await renderWithProviders(<AccountSettingsPage />);

    const nameInput = await screen.findByLabelText("表示名");
    expect(nameInput).toHaveValue("テストユーザー");
  });

  it("プロフィール更新が成功すると updateProfile が呼ばれる", async () => {
    const { spies } = setupAuthClient();
    const user = userEvent.setup();
    await renderWithProviders(<AccountSettingsPage />);

    const nameInput = await screen.findByLabelText("表示名");
    await user.clear(nameInput);
    await user.type(nameInput, "新しい名前");
    await user.click(screen.getByRole("button", { name: "変更を保存" }));

    await waitFor(() => {
      expect(spies.updateProfile).toHaveBeenCalledWith({
        name: "新しい名前",
        image: undefined,
      });
    });
  });

  it("メールアドレス変更が成功すると changeEmail が呼ばれる", async () => {
    const { spies } = setupAuthClient();
    const user = userEvent.setup();
    await renderWithProviders(<AccountSettingsPage />);

    await user.type(
      await screen.findByLabelText("新しいメールアドレス"),
      "new@example.com",
    );
    await user.click(
      screen.getByRole("button", { name: "メールアドレスを変更" }),
    );

    await waitFor(() => {
      expect(spies.changeEmail).toHaveBeenCalledWith({
        newEmail: "new@example.com",
      });
    });
  });

  it("パスワード変更が成功すると changePassword が呼ばれる", async () => {
    const { spies } = setupAuthClient();
    const user = userEvent.setup();
    await renderWithProviders(<AccountSettingsPage />);

    await user.type(
      await screen.findByLabelText("現在のパスワード"),
      "oldpass12",
    );
    await user.type(screen.getByLabelText("新しいパスワード"), "newpass12");
    await user.type(
      screen.getByLabelText("新しいパスワード（確認）"),
      "newpass12",
    );
    await user.click(screen.getByRole("button", { name: "パスワードを変更" }));

    await waitFor(() => {
      expect(spies.changePassword).toHaveBeenCalledWith({
        currentPassword: "oldpass12",
        newPassword: "newpass12",
        newPasswordConfirm: "newpass12",
      });
    });
  });

  it("listAccounts 失敗時は credential あり扱いとなり changePassword 経路が出る", async () => {
    const { spies } = setupAuthClient({ listAccountsShouldFail: true });
    const user = userEvent.setup();
    await renderWithProviders(<AccountSettingsPage />);

    await screen.findByRole("heading", { name: "パスワード" });

    expect(
      await screen.findByLabelText("現在のパスワード"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "パスワードを設定" }),
    ).toBeNull();

    await user.type(screen.getByLabelText("現在のパスワード"), "oldpass12");
    await user.type(screen.getByLabelText("新しいパスワード"), "newpass12");
    await user.type(
      screen.getByLabelText("新しいパスワード（確認）"),
      "newpass12",
    );
    await user.click(screen.getByRole("button", { name: "パスワードを変更" }));

    await waitFor(() => {
      expect(spies.changePassword).toHaveBeenCalled();
    });
    expect(spies.setPassword).not.toHaveBeenCalled();
  });

  it("OAuth-only ユーザーは setPassword が呼ばれ、現在のパスワード入力が出ない", async () => {
    const { spies } = setupAuthClient({
      accounts: [{ providerId: "google" }],
    });
    const user = userEvent.setup();
    await renderWithProviders(<AccountSettingsPage />);

    await screen.findByRole("heading", { name: "パスワード" });

    expect(screen.queryByLabelText("現在のパスワード")).toBeNull();
    expect(
      await screen.findByRole("button", { name: "パスワードを設定" }),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText("パスワード"), "newpass12");
    await user.type(
      screen.getByLabelText("新しいパスワード（確認）"),
      "newpass12",
    );
    await user.click(screen.getByRole("button", { name: "パスワードを設定" }));

    await waitFor(() => {
      expect(spies.setPassword).toHaveBeenCalledWith({
        newPassword: "newpass12",
        newPasswordConfirm: "newpass12",
      });
    });
    expect(spies.changePassword).not.toHaveBeenCalled();
  });

  it("退会フロー (credential): メール一致 + パスワード入力で削除ボタンが有効になる", async () => {
    const { spies } = setupAuthClient();
    const { router } = setupNextNavigation();
    const user = userEvent.setup();
    await renderWithProviders(<AccountSettingsPage />);

    await user.click(
      await screen.findByRole("button", { name: "アカウントを削除する" }),
    );

    const finalDelete = await screen.findByRole("button", {
      name: "完全に削除",
    });
    expect(finalDelete).toBeDisabled();

    await user.type(
      screen.getByLabelText("メールアドレスを再入力"),
      "test@example.com",
    );

    // メールだけでは有効化されない (credential ユーザーはパスワード必須)
    expect(finalDelete).toBeDisabled();

    await user.type(screen.getByLabelText("パスワードを入力"), "secret123");

    await waitFor(() => {
      expect(finalDelete).not.toBeDisabled();
    });

    await user.click(finalDelete);

    await waitFor(() => {
      expect(spies.deleteAccount).toHaveBeenCalledWith({
        confirmEmail: "test@example.com",
        password: "secret123",
      });
    });
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/signin");
    });
  });

  it("退会フロー (OAuth-only): メール一致のみで削除可能、パスワード欄は出ない", async () => {
    const { spies } = setupAuthClient({ accounts: [] });
    const { router } = setupNextNavigation();
    const user = userEvent.setup();
    await renderWithProviders(<AccountSettingsPage />);

    await user.click(
      await screen.findByRole("button", { name: "アカウントを削除する" }),
    );

    const finalDelete = await screen.findByRole("button", {
      name: "完全に削除",
    });
    expect(finalDelete).toBeDisabled();

    expect(screen.queryByLabelText("パスワードを入力")).not.toBeInTheDocument();

    await user.type(
      screen.getByLabelText("メールアドレスを再入力"),
      "test@example.com",
    );

    await waitFor(() => {
      expect(finalDelete).not.toBeDisabled();
    });

    await user.click(finalDelete);

    await waitFor(() => {
      expect(spies.deleteAccount).toHaveBeenCalledWith({
        confirmEmail: "test@example.com",
        password: undefined,
      });
    });
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/signin");
    });
  });

  it("未認証時はサインインへリダイレクトされる", async () => {
    server.use(unauthenticatedHandler);
    const { router } = setupNextNavigation();

    await renderWithProviders(<AccountSettingsPage />);

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/signin");
    });
  });

  it("プロフィール更新失敗時はフォーム入力が保持される", async () => {
    const { spies } = setupAuthClient({ updateProfileShouldFail: true });
    const user = userEvent.setup();
    await renderWithProviders(<AccountSettingsPage />);

    const nameInput = await screen.findByLabelText("表示名");
    await user.clear(nameInput);
    await user.type(nameInput, "失敗ユーザー");
    await user.click(screen.getByRole("button", { name: "変更を保存" }));

    await waitFor(() => {
      expect(spies.updateProfile).toHaveBeenCalledWith({
        name: "失敗ユーザー",
        image: undefined,
      });
    });
    expect(nameInput).toHaveValue("失敗ユーザー");
  });

  it("プロフィール画像 URL が不正な場合はバリデーションエラーになる", async () => {
    const { spies } = setupAuthClient();
    const user = userEvent.setup();
    await renderWithProviders(<AccountSettingsPage />);

    const nameInput = await screen.findByLabelText("表示名");
    await user.clear(nameInput);
    await user.type(nameInput, "別名");
    await user.type(screen.getByLabelText("プロフィール画像 URL"), "not-a-url");
    await user.click(screen.getByRole("button", { name: "変更を保存" }));

    await waitFor(() => {
      expect(spies.updateProfile).not.toHaveBeenCalled();
    });
  });

  it("メールアドレス変更失敗時は入力値が保持される", async () => {
    const { spies } = setupAuthClient({ changeEmailShouldFail: true });
    const user = userEvent.setup();
    await renderWithProviders(<AccountSettingsPage />);

    const emailInput = await screen.findByLabelText("新しいメールアドレス");
    await user.type(emailInput, "fail@example.com");
    await user.click(
      screen.getByRole("button", { name: "メールアドレスを変更" }),
    );

    await waitFor(() => {
      expect(spies.changeEmail).toHaveBeenCalledWith({
        newEmail: "fail@example.com",
      });
    });
    expect(emailInput).toHaveValue("fail@example.com");
  });

  it("メールアドレス形式が不正な場合はバリデーションエラー (送信されない)", async () => {
    const { spies } = setupAuthClient();
    const user = userEvent.setup();
    await renderWithProviders(<AccountSettingsPage />);

    const emailInput = await screen.findByLabelText("新しいメールアドレス");
    await user.type(emailInput, "not-email");
    await user.click(
      screen.getByRole("button", { name: "メールアドレスを変更" }),
    );

    await waitFor(() => {
      expect(spies.changeEmail).not.toHaveBeenCalled();
    });
  });

  it("メールアドレス変更で同じメールを入力すると送信ボタンは無効", async () => {
    const { spies } = setupAuthClient();
    const user = userEvent.setup();
    await renderWithProviders(<AccountSettingsPage />);

    const input = await screen.findByLabelText("新しいメールアドレス");
    await user.type(input, "test@example.com");

    const submitBtn = screen.getByRole("button", {
      name: "メールアドレスを変更",
    });
    expect(submitBtn).toBeDisabled();
    expect(spies.changeEmail).not.toHaveBeenCalled();
  });

  it("パスワード変更失敗時は入力値が保持される (credential)", async () => {
    const { spies } = setupAuthClient({ changePasswordShouldFail: true });
    const user = userEvent.setup();
    await renderWithProviders(<AccountSettingsPage />);

    const cur = await screen.findByLabelText("現在のパスワード");
    await user.type(cur, "oldpass12");
    await user.type(screen.getByLabelText("新しいパスワード"), "newpass12");
    await user.type(
      screen.getByLabelText("新しいパスワード（確認）"),
      "newpass12",
    );
    await user.click(screen.getByRole("button", { name: "パスワードを変更" }));

    await waitFor(() => {
      expect(spies.changePassword).toHaveBeenCalled();
    });
    expect(cur).toHaveValue("oldpass12");
  });

  it("パスワード設定失敗時は入力値が保持される (OAuth-only)", async () => {
    const { spies } = setupAuthClient({
      accounts: [{ providerId: "google" }],
      setPasswordShouldFail: true,
    });
    const user = userEvent.setup();
    await renderWithProviders(<AccountSettingsPage />);

    const newPw = await screen.findByLabelText("パスワード");
    await user.type(newPw, "newpass12");
    await user.type(
      screen.getByLabelText("新しいパスワード（確認）"),
      "newpass12",
    );
    await user.click(screen.getByRole("button", { name: "パスワードを設定" }));

    await waitFor(() => {
      expect(spies.setPassword).toHaveBeenCalled();
    });
    expect(newPw).toHaveValue("newpass12");
  });

  it("OAuth-only でパスワード短すぎる場合はバリデーションで送信されない", async () => {
    const { spies } = setupAuthClient({ accounts: [{ providerId: "google" }] });
    const user = userEvent.setup();
    await renderWithProviders(<AccountSettingsPage />);

    const newPw = await screen.findByLabelText("パスワード");
    await user.type(newPw, "short");
    await user.type(screen.getByLabelText("新しいパスワード（確認）"), "short");
    await user.click(screen.getByRole("button", { name: "パスワードを設定" }));

    await waitFor(() => {
      expect(spies.setPassword).not.toHaveBeenCalled();
    });
  });

  it("パスワード変更でパスワード確認が一致しないとバリデーションエラー", async () => {
    const { spies } = setupAuthClient();
    const user = userEvent.setup();
    await renderWithProviders(<AccountSettingsPage />);

    await user.type(
      await screen.findByLabelText("現在のパスワード"),
      "oldpass12",
    );
    await user.type(screen.getByLabelText("新しいパスワード"), "newpass12");
    await user.type(
      screen.getByLabelText("新しいパスワード（確認）"),
      "different12",
    );
    await user.click(screen.getByRole("button", { name: "パスワードを変更" }));

    await waitFor(() => {
      expect(screen.getByText("パスワードが一致しません")).toBeInTheDocument();
    });
    expect(spies.changePassword).not.toHaveBeenCalled();
  });

  it("退会フロー失敗時はリダイレクトされず削除ボタンが再度押せる", async () => {
    const { spies } = setupAuthClient({ deleteAccountShouldFail: true });
    const { router } = setupNextNavigation();
    const user = userEvent.setup();
    await renderWithProviders(<AccountSettingsPage />);

    await user.click(
      await screen.findByRole("button", { name: "アカウントを削除する" }),
    );
    await user.type(
      screen.getByLabelText("メールアドレスを再入力"),
      "test@example.com",
    );
    await user.type(screen.getByLabelText("パスワードを入力"), "secret123");
    const finalDelete = await screen.findByRole("button", {
      name: "完全に削除",
    });
    await user.click(finalDelete);

    await waitFor(() => {
      expect(spies.deleteAccount).toHaveBeenCalledWith({
        confirmEmail: "test@example.com",
        password: "secret123",
      });
    });
    expect(router.replace).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(finalDelete).not.toBeDisabled();
    });
  });

  it("退会フロー (OAuth-only) 失敗時はパスワード欄なしで再操作可能", async () => {
    const { spies } = setupAuthClient({
      accounts: [],
      deleteAccountShouldFail: true,
    });
    const { router } = setupNextNavigation();
    const user = userEvent.setup();
    await renderWithProviders(<AccountSettingsPage />);

    await user.click(
      await screen.findByRole("button", { name: "アカウントを削除する" }),
    );
    await user.type(
      screen.getByLabelText("メールアドレスを再入力"),
      "test@example.com",
    );
    const finalDelete = await screen.findByRole("button", {
      name: "完全に削除",
    });
    await user.click(finalDelete);

    await waitFor(() => {
      expect(spies.deleteAccount).toHaveBeenCalledWith({
        confirmEmail: "test@example.com",
        password: undefined,
      });
    });
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("退会フロー: メール不一致ならエラーメッセージを表示", async () => {
    setupAuthClient();
    const user = userEvent.setup();
    await renderWithProviders(<AccountSettingsPage />);

    await user.click(
      await screen.findByRole("button", { name: "アカウントを削除する" }),
    );
    await user.type(
      screen.getByLabelText("メールアドレスを再入力"),
      "wrong@example.com",
    );

    expect(
      await screen.findByText("メールアドレスが一致しません"),
    ).toBeInTheDocument();
  });

  it("退会フロー: キャンセルでシートが閉じる", async () => {
    setupAuthClient();
    const user = userEvent.setup();
    await renderWithProviders(<AccountSettingsPage />);

    await user.click(
      await screen.findByRole("button", { name: "アカウントを削除する" }),
    );
    const cancel = await screen.findByRole("button", { name: "キャンセル" });
    await user.click(cancel);

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "完全に削除" }),
      ).not.toBeInTheDocument();
    });
  });

  it("プロフィール画像 URL を入力して更新すると image 引数として送られる", async () => {
    const { spies } = setupAuthClient();
    const user = userEvent.setup();
    await renderWithProviders(<AccountSettingsPage />);

    const nameInput = await screen.findByLabelText("表示名");
    await user.clear(nameInput);
    await user.type(nameInput, "画像更新");
    await user.type(
      screen.getByLabelText("プロフィール画像 URL"),
      "https://example.com/me.png",
    );
    await user.click(screen.getByRole("button", { name: "変更を保存" }));

    await waitFor(() => {
      expect(spies.updateProfile).toHaveBeenCalledWith({
        name: "画像更新",
        image: "https://example.com/me.png",
      });
    });
  });

  it("プロフィール画像 URL が既に設定されているユーザーは img が表示される", async () => {
    server.use(
      http.get("*/api/auth/get-session", () =>
        HttpResponse.json({
          user: {
            id: "user-1",
            name: "テストユーザー",
            email: "test@example.com",
            image: "https://example.com/avatar.png",
            emailVerified: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
      ),
    );
    setupAuthClient();
    const { container } = await renderWithProviders(<AccountSettingsPage />);

    await screen.findByRole("heading", { name: "プロフィール" });
    const img = container.querySelector(
      'img[src="https://example.com/avatar.png"]',
    );
    expect(img).not.toBeNull();
  });
});
