import type { D1Database } from "@cloudflare/workers-types";
import type { Auth } from "../auth";
import { isUserFrozen } from "./user-status";

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
}): Promise<string | undefined> => {
  const result = await auth.api
    .verifyApiKey({ body: { key } })
    .catch(() => undefined);
  if (result?.valid !== true) {
    return undefined;
  }
  const userId = result.key?.referenceId;
  return userId !== undefined && userId !== "" ? userId : undefined;
};

// frozen=true のユーザーは、既存 session / 事前発行 API key を持っていても
// すべての認証経路で「未認証扱い」に丸める。session.create.before での拒否は
// 新規 sign-in を防ぐだけで、フリーズ前に発行済みの credential はそのままでは
// 通ってしまうため、resolve の出口で必ず frozen を弾く。
const rejectIfFrozen = async ({
  db,
  userId,
}: {
  readonly db: D1Database;
  readonly userId: string;
}): Promise<string | undefined> => {
  const frozen = await isUserFrozen({ db, userId });
  return frozen ? undefined : userId;
};

export const resolveAuthenticatedUserId = async ({
  auth,
  db,
  headers,
}: {
  readonly auth: Auth;
  readonly db: D1Database;
  readonly headers: Headers;
}): Promise<string | undefined> => {
  const bearer = extractBearerKey(headers);
  const hasCookie = headers.get("cookie") !== null;

  if (bearer !== undefined && !hasCookie) {
    const userId = await verifyBearer({ auth, key: bearer });
    return userId === undefined
      ? undefined
      : await rejectIfFrozen({ db, userId });
  }

  const session = await auth.api.getSession({ headers }).catch(() => undefined);
  const sessionUserId = session?.user.id;
  if (sessionUserId !== undefined && sessionUserId !== "") {
    return await rejectIfFrozen({ db, userId: sessionUserId });
  }

  if (bearer === undefined) {
    return undefined;
  }
  const userId = await verifyBearer({ auth, key: bearer });
  return userId === undefined
    ? undefined
    : await rejectIfFrozen({ db, userId });
};
