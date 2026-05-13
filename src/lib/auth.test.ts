import { beforeEach, describe, expect, it, vi } from "vitest";

// setup.ts で集約モックされている `@/lib/auth` を本物に置き換え、
// 内部で使う better-auth クライアントだけスタブ化してテストする。
vi.unmock("@/lib/auth");

const mockClient = () => ({
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
});

const clientHolder: { current: ReturnType<typeof mockClient> } = {
  current: mockClient(),
};

vi.mock("better-auth/react", () => ({
  createAuthClient: () => clientHolder.current,
}));

vi.mock("@better-auth/api-key/client", () => ({
  apiKeyClient: () => ({}),
}));

vi.mock("@/lib/workersUrl", () => ({
  WORKERS_URL_FOR_FETCH: "http://localhost:8787",
}));

describe("@/lib/auth (本物)", () => {
  beforeEach(() => {
    clientHolder.current = mockClient();
    vi.resetModules();
  });

  describe("getSession", () => {
    it("成功時に rawData をマッピングして返す", async () => {
      const updatedAt = new Date();
      clientHolder.current.getSession.mockResolvedValue({
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
      clientHolder.current.getSession.mockResolvedValue({
        data: null,
        error: null,
      });

      const { getSession } = await import("@/lib/auth");
      const res = await getSession();
      expect(res.data).toBeUndefined();
    });

    it("image がある場合はそのまま透過する", async () => {
      clientHolder.current.getSession.mockResolvedValue({
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
      clientHolder.current.getSession.mockResolvedValue({
        data: null,
        error: { message: "boom" },
      });

      const { getSession } = await import("@/lib/auth");
      await expect(getSession()).rejects.toThrow("boom");
    });

    it("error.message が未定義のときは既定メッセージで throw する", async () => {
      clientHolder.current.getSession.mockResolvedValue({
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
      clientHolder.current.listAccounts.mockResolvedValue({
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
      clientHolder.current.listAccounts.mockResolvedValue({
        data: null,
        error: { message: "denied" },
      });
      const { listAccounts } = await import("@/lib/auth");
      await expect(listAccounts()).rejects.toThrow("denied");
    });

    it("error.message が無いときは既定メッセージで throw", async () => {
      clientHolder.current.listAccounts.mockResolvedValue({
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
      clientHolder.current.signIn.email.mockResolvedValue({ error: null });
      const { signInWithEmail } = await import("@/lib/auth");
      await expect(
        signInWithEmail({ email: "e@example.com", password: "pw12345678" }),
      ).resolves.toBeUndefined();
    });

    it("error 時は throw する", async () => {
      clientHolder.current.signIn.email.mockResolvedValue({
        error: { message: "bad" },
      });
      const { signInWithEmail } = await import("@/lib/auth");
      await expect(
        signInWithEmail({ email: "e@example.com", password: "pw12345678" }),
      ).rejects.toThrow("bad");
    });

    it("error.message 無しは既定メッセージで throw", async () => {
      clientHolder.current.signIn.email.mockResolvedValue({ error: {} });
      const { signInWithEmail } = await import("@/lib/auth");
      await expect(
        signInWithEmail({ email: "e@example.com", password: "pw12345678" }),
      ).rejects.toThrow("ログインに失敗しました");
    });
  });

  describe("signUpWithEmail", () => {
    it("成功", async () => {
      clientHolder.current.signUp.email.mockResolvedValue({ error: null });
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
      clientHolder.current.signUp.email.mockResolvedValue({
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
      clientHolder.current.signUp.email.mockResolvedValue({ error: {} });
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
      clientHolder.current.updateUser.mockResolvedValue({ error: null });
      const { updateProfile } = await import("@/lib/auth");
      await expect(
        updateProfile({ name: "n", image: undefined }),
      ).resolves.toBeUndefined();
    });
    it("error", async () => {
      clientHolder.current.updateUser.mockResolvedValue({
        error: { message: "no" },
      });
      const { updateProfile } = await import("@/lib/auth");
      await expect(
        updateProfile({ name: "n", image: undefined }),
      ).rejects.toThrow("no");
    });
    it("既定 error", async () => {
      clientHolder.current.updateUser.mockResolvedValue({ error: {} });
      const { updateProfile } = await import("@/lib/auth");
      await expect(
        updateProfile({ name: "n", image: undefined }),
      ).rejects.toThrow("プロフィール更新に失敗しました");
    });
  });

  describe("changeEmail", () => {
    it("成功", async () => {
      clientHolder.current.changeEmail.mockResolvedValue({ error: null });
      const { changeEmail } = await import("@/lib/auth");
      await expect(
        changeEmail({ newEmail: "new@example.com" }),
      ).resolves.toBeUndefined();
    });
    it("error", async () => {
      clientHolder.current.changeEmail.mockResolvedValue({
        error: { message: "taken" },
      });
      const { changeEmail } = await import("@/lib/auth");
      await expect(
        changeEmail({ newEmail: "new@example.com" }),
      ).rejects.toThrow("taken");
    });
    it("既定 error", async () => {
      clientHolder.current.changeEmail.mockResolvedValue({ error: {} });
      const { changeEmail } = await import("@/lib/auth");
      await expect(
        changeEmail({ newEmail: "new@example.com" }),
      ).rejects.toThrow("メールアドレス変更に失敗しました");
    });
  });

  describe("changePassword", () => {
    it("成功", async () => {
      clientHolder.current.changePassword.mockResolvedValue({ error: null });
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
      clientHolder.current.changePassword.mockResolvedValue({ error: null });
      const { changePassword } = await import("@/lib/auth");
      await changePassword({
        currentPassword: undefined,
        newPassword: "newpass12",
        newPasswordConfirm: "newpass12",
      });
      expect(clientHolder.current.changePassword).toHaveBeenCalledWith({
        currentPassword: "",
        newPassword: "newpass12",
        revokeOtherSessions: true,
      });
    });
    it("error", async () => {
      clientHolder.current.changePassword.mockResolvedValue({
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
      clientHolder.current.changePassword.mockResolvedValue({ error: {} });
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
      clientHolder.current.$fetch.mockResolvedValue({ error: null });
      const { setPassword } = await import("@/lib/auth");
      await expect(
        setPassword({
          newPassword: "newpass12",
          newPasswordConfirm: "newpass12",
        }),
      ).resolves.toBeUndefined();
      expect(clientHolder.current.$fetch).toHaveBeenCalledWith(
        "/set-password",
        expect.objectContaining({
          method: "POST",
          body: { newPassword: "newpass12" },
        }),
      );
    });
    it("error", async () => {
      clientHolder.current.$fetch.mockResolvedValue({
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
      clientHolder.current.$fetch.mockResolvedValue({ error: {} });
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
      clientHolder.current.$fetch.mockResolvedValue({ error: null });
      const { deleteAccount } = await import("@/lib/auth");
      await deleteAccount({ confirmEmail: "e@example.com" });
      expect(clientHolder.current.$fetch).toHaveBeenCalledWith(
        "/delete-user",
        expect.objectContaining({
          method: "POST",
          body: { confirmEmail: "e@example.com" },
        }),
      );
    });
    it("password ありは password を一緒に送る", async () => {
      clientHolder.current.$fetch.mockResolvedValue({ error: null });
      const { deleteAccount } = await import("@/lib/auth");
      await deleteAccount({ confirmEmail: "e@example.com", password: "p" });
      expect(clientHolder.current.$fetch).toHaveBeenCalledWith(
        "/delete-user",
        expect.objectContaining({
          body: { confirmEmail: "e@example.com", password: "p" },
        }),
      );
    });
    it("error", async () => {
      clientHolder.current.$fetch.mockResolvedValue({
        error: { message: "no" },
      });
      const { deleteAccount } = await import("@/lib/auth");
      await expect(
        deleteAccount({ confirmEmail: "e@example.com" }),
      ).rejects.toThrow("no");
    });
    it("既定 error", async () => {
      clientHolder.current.$fetch.mockResolvedValue({ error: {} });
      const { deleteAccount } = await import("@/lib/auth");
      await expect(
        deleteAccount({ confirmEmail: "e@example.com" }),
      ).rejects.toThrow("アカウント削除に失敗しました");
    });
  });
});
