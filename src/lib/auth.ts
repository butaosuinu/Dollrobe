import { createAuthClient } from "better-auth/react";
import { apiKeyClient } from "@better-auth/api-key/client";
import { z } from "zod";
import { WORKERS_URL_FOR_FETCH } from "@/lib/workersUrl";

const AUTH_BASE_URL =
  WORKERS_URL_FOR_FETCH === ""
    ? `${window.location.origin}/api/auth`
    : `${WORKERS_URL_FOR_FETCH}/api/auth`;

const client = createAuthClient({
  baseURL: AUTH_BASE_URL,
  plugins: [apiKeyClient()],
});

export type SessionUser = {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly image: string | undefined;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type SessionResponse = {
  readonly data:
    | {
        readonly user: SessionUser;
      }
    | undefined;
};

const { signOut: clientSignOut, signIn, signUp } = client;
const { social } = signIn;

export const signInSocial = social;
export const signOut = clientSignOut;

export const getSession = async (): Promise<SessionResponse> => {
  const { data: rawData } = await client.getSession();
  return {
    data:
      rawData === null
        ? undefined
        : {
            user: {
              ...rawData.user,
              image: rawData.user.image ?? undefined,
            },
          },
  };
};

export type LinkedAccount = {
  readonly providerId: string;
};

// 取得失敗時は throw し、accountsAtom 側で "error" sentinel に変換する。
// [] を返すと credential ありユーザーが OAuth-only と誤判定され、setPassword
// 分岐に流されて詰まる。fail-closed を効かせるため呼び出し側で reject を伝える。
export const listAccounts = async (): Promise<readonly LinkedAccount[]> => {
  const { data, error } = await client.listAccounts();
  return error === null
    ? data.map((a) => ({ providerId: a.providerId }))
    : fail(error.message ?? "アカウント一覧の取得に失敗しました");
};

const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;
const NAME_MAX = 60;

const emailField = z.string().trim().pipe(z.email());
const passwordField = z.string().min(PASSWORD_MIN).max(PASSWORD_MAX);
const nameField = z.string().trim().min(1).max(NAME_MAX);
const optionalImageField = z
  .string()
  .trim()
  .pipe(z.url())
  .optional()
  .or(z.literal("").transform(() => undefined));

export const signInEmailSchema = z.object({
  email: emailField,
  password: z.string().min(1),
});

export const signUpEmailSchema = z
  .object({
    name: nameField,
    email: emailField,
    password: passwordField,
    passwordConfirm: passwordField,
  })
  .refine((v) => v.password === v.passwordConfirm, {
    path: ["passwordConfirm"],
    message: "パスワードが一致しません",
  });

export const updateProfileSchema = z.object({
  name: nameField,
  image: optionalImageField,
});

export const changeEmailSchema = z.object({
  newEmail: emailField,
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).optional(),
    newPassword: passwordField,
    newPasswordConfirm: passwordField,
  })
  .refine((v) => v.newPassword === v.newPasswordConfirm, {
    path: ["newPasswordConfirm"],
    message: "パスワードが一致しません",
  });

export const setPasswordSchema = z
  .object({
    newPassword: passwordField,
    newPasswordConfirm: passwordField,
  })
  .refine((v) => v.newPassword === v.newPasswordConfirm, {
    path: ["newPasswordConfirm"],
    message: "パスワードが一致しません",
  });

export const deleteAccountSchema = z.object({
  confirmEmail: emailField,
  password: z.string().min(1).optional(),
});

export type SignInEmailInput = z.infer<typeof signInEmailSchema>;
export type SignUpEmailInput = z.infer<typeof signUpEmailSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangeEmailInput = z.infer<typeof changeEmailSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type SetPasswordInput = z.infer<typeof setPasswordSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

const fail = (msg: string): never => {
  // eslint-disable-next-line functional/no-throw-statements -- caller catches
  throw new Error(msg);
};

export const signInWithEmail = async (
  input: SignInEmailInput,
): Promise<void> => {
  const { error } = await client.signIn.email({
    email: input.email,
    password: input.password,
  });
  return error === null
    ? undefined
    : fail(error.message ?? "ログインに失敗しました");
};

export const signUpWithEmail = async (input: {
  readonly name: string;
  readonly email: string;
  readonly password: string;
}): Promise<void> => {
  const { error } = await signUp.email({
    name: input.name,
    email: input.email,
    password: input.password,
  });
  return error === null
    ? undefined
    : fail(error.message ?? "サインアップに失敗しました");
};

export const updateProfile = async (
  input: UpdateProfileInput,
): Promise<void> => {
  const { error } = await client.updateUser({
    name: input.name,
    image: input.image,
  });
  return error === null
    ? undefined
    : fail(error.message ?? "プロフィール更新に失敗しました");
};

export const changeEmail = async (input: ChangeEmailInput): Promise<void> => {
  const { error } = await client.changeEmail({
    newEmail: input.newEmail,
  });
  return error === null
    ? undefined
    : fail(error.message ?? "メールアドレス変更に失敗しました");
};

export const changePassword = async (
  input: ChangePasswordInput,
): Promise<void> => {
  const { error } = await client.changePassword({
    currentPassword: input.currentPassword ?? "",
    newPassword: input.newPassword,
    revokeOtherSessions: true,
  });
  return error === null
    ? undefined
    : fail(error.message ?? "パスワード変更に失敗しました");
};

// OAuth-only ユーザー (credential アカウント未保有) 向けの初回パスワード設定。
// better-auth の POST /set-password を呼ぶ。既に credential ありなら 400 で弾かれる。
// client.setPassword は dynamic proxy で型に出ないため、$fetch を直接使う。
export const setPassword = async (input: SetPasswordInput): Promise<void> => {
  const { error } = await client.$fetch("/set-password", {
    method: "POST",
    body: { newPassword: input.newPassword },
  });
  return error === null
    ? undefined
    : fail(error.message ?? "パスワード設定に失敗しました");
};

export const deleteAccount = async (
  input: DeleteAccountInput,
): Promise<void> => {
  const { error } = await client.deleteUser(
    input.password === undefined ? {} : { password: input.password },
  );
  return error === null
    ? undefined
    : fail(error.message ?? "アカウント削除に失敗しました");
};

export const API_KEY_SCOPE = Object.freeze({
  READ_ONLY: "read-only",
  READ_WRITE: "read-write",
} as const);

export type ApiKeyScope = (typeof API_KEY_SCOPE)[keyof typeof API_KEY_SCOPE];

const SCOPE_PERMISSIONS: Record<ApiKeyScope, Record<string, string[]>> = {
  "read-only": { all: ["read"] },
  "read-write": { all: ["read", "write"] },
};

const permissionsSchema = z
  .record(z.string(), z.array(z.string()))
  .nullable()
  .optional();

const permissionsToScope = (raw: unknown): ApiKeyScope => {
  const parsed = permissionsSchema.safeParse(raw);
  const actions = parsed.success ? (parsed.data?.all ?? []) : [];
  return actions.includes("write")
    ? API_KEY_SCOPE.READ_WRITE
    : API_KEY_SCOPE.READ_ONLY;
};

export type ApiKeySummary = {
  readonly id: string;
  readonly name: string;
  readonly scope: ApiKeyScope;
  readonly createdAt: number;
  readonly lastRequestAt: number | undefined;
  readonly enabled: boolean;
};

export type CreatedApiKey = ApiKeySummary & {
  readonly key: string;
};

const dateLikeSchema = z
  .union([z.date(), z.string(), z.number()])
  .nullable()
  .optional();

const toMillis = (raw: unknown): number => {
  const parsed = dateLikeSchema.safeParse(raw);
  return !parsed.success || parsed.data == null
    ? 0
    : parsed.data instanceof Date
      ? parsed.data.getTime()
      : typeof parsed.data === "number"
        ? parsed.data
        : new Date(parsed.data).getTime();
};

const toLastRequest = (raw: unknown): number | undefined => {
  const ms = toMillis(raw);
  return ms === 0 ? undefined : ms;
};

export const createApiKey = async (input: {
  readonly name: string;
  readonly scope: ApiKeyScope;
}): Promise<CreatedApiKey> => {
  const { data, error } = await client.apiKey.create({
    name: input.name,
    permissions: SCOPE_PERMISSIONS[input.scope],
  });
  return error === null
    ? {
        id: data.id,
        name: data.name ?? input.name,
        scope: input.scope,
        createdAt: toMillis(data.createdAt),
        lastRequestAt: undefined,
        enabled: data.enabled,
        key: data.key,
      }
    : fail(error.message ?? "Failed to create API key");
};

export const listApiKeys = async (): Promise<readonly ApiKeySummary[]> => {
  const { data, error } = await client.apiKey.list();
  return error === null
    ? data.apiKeys.map((item) => ({
        id: item.id,
        name: item.name ?? "",
        scope: permissionsToScope(item.permissions),
        createdAt: toMillis(item.createdAt),
        lastRequestAt: toLastRequest(item.lastRequest),
        enabled: item.enabled,
      }))
    : fail(error.message ?? "Failed to list API keys");
};

export const revokeApiKey = async (keyId: string): Promise<void> => {
  const { error } = await client.apiKey.delete({ keyId });
  return error === null
    ? undefined
    : fail(error.message ?? "Failed to revoke API key");
};
