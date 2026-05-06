import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("OAuth-only ユーザーはパスワード設定モードで現在のパスワード入力が出ない", async () => {
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
      expect(spies.changePassword).toHaveBeenCalledWith({
        currentPassword: undefined,
        newPassword: "newpass12",
        newPasswordConfirm: "newpass12",
      });
    });
  });

  it("退会フローでメール一致時のみ削除ボタンが有効", async () => {
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

    await waitFor(() => {
      expect(finalDelete).not.toBeDisabled();
    });

    await user.click(finalDelete);

    await waitFor(() => {
      expect(spies.deleteAccount).toHaveBeenCalledWith({
        confirmEmail: "test@example.com",
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
});
