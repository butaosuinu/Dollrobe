import type { D1Database } from "@cloudflare/workers-types";
import type { Auth } from "../auth";
import { extractBearerKey } from "../lib/auth-resolver";
import { isUserFrozen } from "../lib/user-status";
import { parsePermissions, type McpScope } from "./scopes";

export type McpAuth = {
  readonly userId: string;
  readonly scope: McpScope;
};

export const resolveMcpAuth = async ({
  auth,
  db,
  headers,
}: {
  readonly auth: Auth;
  readonly db: D1Database;
  readonly headers: Headers;
}): Promise<McpAuth | undefined> => {
  const key = extractBearerKey(headers);
  if (key === undefined) {
    return undefined;
  }

  const result = await auth.api
    .verifyApiKey({ body: { key } })
    .catch(() => undefined);
  if (result?.valid !== true) {
    return undefined;
  }

  const userId = result.key?.referenceId;
  if (userId === undefined || userId === "") {
    return undefined;
  }

  // frozen ユーザーの API key は revoke するまで使い続けられないように、
  // 認証成立直前で必ず弾く。session.create.before は新規 sign-in しか
  // 防がないため、ここで二重ガードする。
  const frozen = await isUserFrozen({ db, userId });
  if (frozen) {
    return undefined;
  }

  const scope = parsePermissions(result.key?.permissions);
  if (scope === undefined) {
    return undefined;
  }

  return { userId, scope };
};
