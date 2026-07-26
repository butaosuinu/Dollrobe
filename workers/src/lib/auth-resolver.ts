import type { D1Database } from "@cloudflare/workers-types";
import type { Auth } from "../auth";
import {
  API_KEY_PERMISSION_NAMESPACE,
  API_KEY_SCOPE,
  hasApiKeyScope,
  parseApiKeyScope,
} from "./api-key-permissions";
import type { ApiKeyScope } from "./api-key-permissions";
import { isUserActive } from "./user-status";

const BEARER_PREFIX = "bearer ";

export const extractBearerKey = (headers: Headers): string | undefined => {
  const raw = headers.get("authorization");
  if (raw == null) {
    return undefined;
  }
  const lower = raw.toLowerCase();
  if (!lower.startsWith(BEARER_PREFIX)) {
    return undefined;
  }
  const key = raw.slice(BEARER_PREFIX.length).trim();
  return key !== "" ? key : undefined;
};

const verifyBearer = async ({
  auth,
  key,
}: {
  readonly auth: Auth;
  readonly key: string;
}): Promise<
  { readonly userId: string; readonly scope: ApiKeyScope } | undefined
> => {
  const result = await auth.api
    .verifyApiKey({ body: { key } })
    .catch(() => undefined);
  if (result?.valid !== true) {
    return undefined;
  }
  const userId = result.key?.referenceId;
  const scope = parseApiKeyScope({
    permissions: result.key?.permissions,
    namespace: API_KEY_PERMISSION_NAMESPACE.ALL,
  });
  return userId !== undefined && userId !== "" && scope !== undefined
    ? { userId, scope }
    : undefined;
};

// frozen=true または削除済みのユーザーは、既存 session / 事前発行 API key
// を持っていてもすべての認証経路で「未認証扱い」に丸める。
// session.create.before での拒否は新規 sign-in を防ぐだけなので、resolve の
// 出口で所有ユーザーが存在して active であることを必ず確認する。
const rejectIfInactive = async ({
  db,
  userId,
}: {
  readonly db: D1Database;
  readonly userId: string;
}): Promise<string | undefined> => {
  const active = await isUserActive({ db, userId });
  return active ? userId : undefined;
};

const resolveBearerUserId = async ({
  auth,
  db,
  key,
  requiredScope,
}: {
  readonly auth: Auth;
  readonly db: D1Database;
  readonly key: string;
  readonly requiredScope: ApiKeyScope;
}): Promise<string | undefined> => {
  const verified = await verifyBearer({ auth, key });
  if (
    verified === undefined ||
    !hasApiKeyScope({ current: verified.scope, required: requiredScope })
  ) {
    return undefined;
  }
  return await rejectIfInactive({ db, userId: verified.userId });
};

export const resolveAuthenticatedUserId = async ({
  auth,
  db,
  headers,
  requiredApiKeyScope = API_KEY_SCOPE.READ,
}: {
  readonly auth: Auth;
  readonly db: D1Database;
  readonly headers: Headers;
  readonly requiredApiKeyScope?: ApiKeyScope;
}): Promise<string | undefined> => {
  const bearer = extractBearerKey(headers);
  const hasCookie = headers.get("cookie") !== null;

  if (bearer !== undefined && !hasCookie) {
    return await resolveBearerUserId({
      auth,
      db,
      key: bearer,
      requiredScope: requiredApiKeyScope,
    });
  }

  const session = await auth.api.getSession({ headers }).catch(() => undefined);
  const sessionUserId = session?.user.id;
  if (sessionUserId !== undefined && sessionUserId !== "") {
    return await rejectIfInactive({ db, userId: sessionUserId });
  }

  if (bearer === undefined) {
    return undefined;
  }
  return await resolveBearerUserId({
    auth,
    db,
    key: bearer,
    requiredScope: requiredApiKeyScope,
  });
};
