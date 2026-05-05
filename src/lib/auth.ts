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

const { signOut: clientSignOut, signIn } = client;
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

export const API_KEY_SCOPE = Object.freeze({
  READ_ONLY: "read-only",
  READ_WRITE: "read-write",
});

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

const fail = (msg: string): never => {
  // eslint-disable-next-line functional/no-throw-statements -- ErrorBoundary handles via Suspense
  throw new Error(msg);
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
