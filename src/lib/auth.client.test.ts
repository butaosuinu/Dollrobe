import { beforeEach, describe, expect, it, vi } from "vitest";

// setup.ts で集約モックされている `@/lib/auth` を本物に置き換え、
// 内部で使う better-auth クライアントだけスタブ化してテストする。
vi.unmock("@/lib/auth");

// vi.mock factory は静的に hoist されるため、参照する client も
// vi.hoisted で同じ位置に巻き上げる必要がある。
// client は immutable な参照で固定し、各テストでは vi.fn の
// mockResolvedValue 上書きと vi.resetAllMocks による履歴/return 値の
// リセットで状態を制御する。
const { client } = vi.hoisted(() => ({
  client: {
    getSession: vi.fn(),
    listAccounts: vi.fn(),
    signIn: { email: vi.fn(), social: vi.fn() },
    signUp: { email: vi.fn() },
    signOut: vi.fn(),
    updateUser: vi.fn(),
    changeEmail: vi.fn(),
    changePassword: vi.fn(),
    $fetch: vi.fn(),
    apiKey: { create: vi.fn(), list: vi.fn(), delete: vi.fn() },
  },
}));

vi.mock("better-auth/react", () => ({
  createAuthClient: () => client,
}));

vi.mock("@better-auth/api-key/client", () => ({
  apiKeyClient: () => ({}),
}));

vi.mock("@/lib/workersUrl", () => ({
  WORKERS_URL_FOR_FETCH: "http://localhost:8787",
}));

describe("@/lib/auth (本物)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
  });

  describe("getSession", () => {
    it("成功時に rawData をマッピングして返す", async () => {
      const updatedAt = new Date();
      client.getSession.mockResolvedValue({
        data: {
          user: {
            id: "u-1",
            name: "n",
            email: "e@example.com",
            emailVerified: true,
            image: null,
            createdAt: new Date(),
            updatedAt,
          },
        },
        error: null,
      });

      const { getSession } = await import("@/lib/auth");
      const res = await getSession();
      expect(res.data).toBeDefined();
      expect(res.data?.user.image).toBeUndefined();
    });

    it("rawData が null のときは data: undefined を返す", async () => {
      client.getSession.mockResolvedValue({
        data: null,
        error: null,
      });

      const { getSession } = await import("@/lib/auth");
      const res = await getSession();
      expect(res.data).toBeUndefined();
    });

    it("image がある場合はそのまま透過する", async () => {
      client.getSession.mockResolvedValue({
        data: {
          user: {
            id: "u-1",
            name: "n",
            email: "e@example.com",
            emailVerified: false,
            image: "https://example.com/me.png",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        error: null,
      });

      const { getSession } = await import("@/lib/auth");
      const res = await getSession();
      expect(res.data?.user.image).toBe("https://example.com/me.png");
    });

    it("error 時は throw する", async () => {
      client.getSession.mockResolvedValue({
        data: null,
        error: { message: "boom" },
      });

      const { getSession } = await import("@/lib/auth");
      await expect(getSession()).rejects.toThrow("boom");
    });

    it("error.message が未定義のときは既定メッセージで throw する", async () => {
      client.getSession.mockResolvedValue({
        data: null,
        error: {},
      });
      const { getSession } = await import("@/lib/auth");
      await expect(getSession()).rejects.toThrow(
        "セッション取得に失敗しました",
      );
    });
  });

  describe("listAccounts", () => {
    it("成功時に providerId 配列を返す", async () => {
      client.listAccounts.mockResolvedValue({
        data: [{ providerId: "credential" }, { providerId: "google" }],
        error: null,
      });
      const { listAccounts } = await import("@/lib/auth");
      const res = await listAccounts();
      expect(res).toEqual([
        { providerId: "credential" },
        { providerId: "google" },
      ]);
    });

    it("error 時は throw する", async () => {
      client.listAccounts.mockResolvedValue({
        data: null,
        error: { message: "denied" },
      });
      const { listAccounts } = await import("@/lib/auth");
      await expect(listAccounts()).rejects.toThrow("denied");
    });

    it("error.message が無いときは既定メッセージで throw", async () => {
      client.listAccounts.mockResolvedValue({
        data: null,
        error: {},
      });
      const { listAccounts } = await import("@/lib/auth");
      await expect(listAccounts()).rejects.toThrow(
        "アカウント一覧の取得に失敗しました",
      );
    });
  });

  describe("signInWithEmail", () => {
    it("成功時に void を返す", async () => {
      client.signIn.email.mockResolvedValue({ error: null });
      const { signInWithEmail } = await import("@/lib/auth");
      await expect(
        signInWithEmail({ email: "e@example.com", password: "pw12345678" }),
      ).resolves.toBeUndefined();
    });

    it("error 時は throw する", async () => {
      client.signIn.email.mockResolvedValue({
        error: { message: "bad" },
      });
      const { signInWithEmail } = await import("@/lib/auth");
      await expect(
        signInWithEmail({ email: "e@example.com", password: "pw12345678" }),
      ).rejects.toThrow("bad");
    });

    it("error.message 無しは既定メッセージで throw", async () => {
      client.signIn.email.mockResolvedValue({ error: {} });
      const { signInWithEmail } = await import("@/lib/auth");
      await expect(
        signInWithEmail({ email: "e@example.com", password: "pw12345678" }),
      ).rejects.toThrow("ログインに失敗しました");
    });
  });

  describe("signUpWithEmail", () => {
    it("成功", async () => {
      client.signUp.email.mockResolvedValue({ error: null });
      const { signUpWithEmail } = await import("@/lib/auth");
      await expect(
        signUpWithEmail({
          name: "n",
          email: "e@example.com",
          password: "pw12345678",
        }),
      ).resolves.toBeUndefined();
    });

    it("error 時 throw", async () => {
      client.signUp.email.mockResolvedValue({
        error: { message: "exists" },
      });
      const { signUpWithEmail } = await import("@/lib/auth");
      await expect(
        signUpWithEmail({
          name: "n",
          email: "e@example.com",
          password: "pw12345678",
        }),
      ).rejects.toThrow("exists");
    });

    it("error.message なしは既定メッセージで throw", async () => {
      client.signUp.email.mockResolvedValue({ error: {} });
      const { signUpWithEmail } = await import("@/lib/auth");
      await expect(
        signUpWithEmail({
          name: "n",
          email: "e@example.com",
          password: "pw12345678",
        }),
      ).rejects.toThrow("サインアップに失敗しました");
    });
  });

  describe("updateProfile", () => {
    it("成功", async () => {
      client.updateUser.mockResolvedValue({ error: null });
      const { updateProfile } = await import("@/lib/auth");
      await expect(
        updateProfile({ name: "n", image: undefined }),
      ).resolves.toBeUndefined();
    });
    it("error", async () => {
      client.updateUser.mockResolvedValue({
        error: { message: "no" },
      });
      const { updateProfile } = await import("@/lib/auth");
      await expect(
        updateProfile({ name: "n", image: undefined }),
      ).rejects.toThrow("no");
    });
    it("既定 error", async () => {
      client.updateUser.mockResolvedValue({ error: {} });
      const { updateProfile } = await import("@/lib/auth");
      await expect(
        updateProfile({ name: "n", image: undefined }),
      ).rejects.toThrow("プロフィール更新に失敗しました");
    });
  });

  describe("changeEmail", () => {
    it("成功", async () => {
      client.changeEmail.mockResolvedValue({ error: null });
      const { changeEmail } = await import("@/lib/auth");
      await expect(
        changeEmail({ newEmail: "new@example.com" }),
      ).resolves.toBeUndefined();
    });
    it("error", async () => {
      client.changeEmail.mockResolvedValue({
        error: { message: "taken" },
      });
      const { changeEmail } = await import("@/lib/auth");
      await expect(
        changeEmail({ newEmail: "new@example.com" }),
      ).rejects.toThrow("taken");
    });
    it("既定 error", async () => {
      client.changeEmail.mockResolvedValue({ error: {} });
      const { changeEmail } = await import("@/lib/auth");
      await expect(
        changeEmail({ newEmail: "new@example.com" }),
      ).rejects.toThrow("メールアドレス変更に失敗しました");
    });
  });

  describe("changePassword", () => {
    it("成功", async () => {
      client.changePassword.mockResolvedValue({ error: null });
      const { changePassword } = await import("@/lib/auth");
      await expect(
        changePassword({
          currentPassword: "old1",
          newPassword: "newpass12",
          newPasswordConfirm: "newpass12",
        }),
      ).resolves.toBeUndefined();
    });
    it("currentPassword 省略時は空文字に丸める", async () => {
      client.changePassword.mockResolvedValue({ error: null });
      const { changePassword } = await import("@/lib/auth");
      await changePassword({
        currentPassword: undefined,
        newPassword: "newpass12",
        newPasswordConfirm: "newpass12",
      });
      expect(client.changePassword).toHaveBeenCalledWith({
        currentPassword: "",
        newPassword: "newpass12",
        revokeOtherSessions: true,
      });
    });
    it("error", async () => {
      client.changePassword.mockResolvedValue({
        error: { message: "wrong" },
      });
      const { changePassword } = await import("@/lib/auth");
      await expect(
        changePassword({
          currentPassword: "old1",
          newPassword: "newpass12",
          newPasswordConfirm: "newpass12",
        }),
      ).rejects.toThrow("wrong");
    });
    it("既定 error", async () => {
      client.changePassword.mockResolvedValue({ error: {} });
      const { changePassword } = await import("@/lib/auth");
      await expect(
        changePassword({
          currentPassword: "old1",
          newPassword: "newpass12",
          newPasswordConfirm: "newpass12",
        }),
      ).rejects.toThrow("パスワード変更に失敗しました");
    });
  });

  describe("setPassword", () => {
    it("成功", async () => {
      client.$fetch.mockResolvedValue({ error: null });
      const { setPassword } = await import("@/lib/auth");
      await expect(
        setPassword({
          newPassword: "newpass12",
          newPasswordConfirm: "newpass12",
        }),
      ).resolves.toBeUndefined();
      expect(client.$fetch).toHaveBeenCalledWith(
        "/set-password",
        expect.objectContaining({
          method: "POST",
          body: { newPassword: "newpass12" },
        }),
      );
    });
    it("error", async () => {
      client.$fetch.mockResolvedValue({
        error: { message: "exists" },
      });
      const { setPassword } = await import("@/lib/auth");
      await expect(
        setPassword({
          newPassword: "newpass12",
          newPasswordConfirm: "newpass12",
        }),
      ).rejects.toThrow("exists");
    });
    it("既定 error", async () => {
      client.$fetch.mockResolvedValue({ error: {} });
      const { setPassword } = await import("@/lib/auth");
      await expect(
        setPassword({
          newPassword: "newpass12",
          newPasswordConfirm: "newpass12",
        }),
      ).rejects.toThrow("パスワード設定に失敗しました");
    });
  });

  describe("deleteAccount", () => {
    it("password 無しは confirmEmail のみ送る", async () => {
      client.$fetch.mockResolvedValue({ error: null });
      const { deleteAccount } = await import("@/lib/auth");
      await deleteAccount({ confirmEmail: "e@example.com" });
      expect(client.$fetch).toHaveBeenCalledWith(
        "/delete-user",
        expect.objectContaining({
          method: "POST",
          body: { confirmEmail: "e@example.com" },
        }),
      );
    });
    it("password ありは password を一緒に送る", async () => {
      client.$fetch.mockResolvedValue({ error: null });
      const { deleteAccount } = await import("@/lib/auth");
      await deleteAccount({ confirmEmail: "e@example.com", password: "p" });
      expect(client.$fetch).toHaveBeenCalledWith(
        "/delete-user",
        expect.objectContaining({
          body: { confirmEmail: "e@example.com", password: "p" },
        }),
      );
    });
    it("error", async () => {
      client.$fetch.mockResolvedValue({
        error: { message: "no" },
      });
      const { deleteAccount } = await import("@/lib/auth");
      await expect(
        deleteAccount({ confirmEmail: "e@example.com" }),
      ).rejects.toThrow("no");
    });
    it("既定 error", async () => {
      client.$fetch.mockResolvedValue({ error: {} });
      const { deleteAccount } = await import("@/lib/auth");
      await expect(
        deleteAccount({ confirmEmail: "e@example.com" }),
      ).rejects.toThrow("アカウント削除に失敗しました");
    });
  });
});
