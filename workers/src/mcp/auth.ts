import type { D1Database } from "@cloudflare/workers-types";
import type { Auth } from "../auth";
import { extractBearerKey } from "../lib/auth-resolver";
import { isUserActive } from "../lib/user-status";
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

  // frozen または削除済みユーザーの API key は、認証成立直前で必ず弾く。
  // session.create.before は新規 sign-in しか防がないため、ここで
  // 所有ユーザーの存在と状態を二重ガードする。
  const active = await isUserActive({ db, userId });
  if (!active) {
    return undefined;
  }

  const scope = parsePermissions(result.key?.permissions);
  if (scope === undefined) {
    return undefined;
  }

  return { userId, scope };
};
