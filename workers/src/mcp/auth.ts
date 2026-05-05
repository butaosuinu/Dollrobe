import type { Auth } from "../auth";
import { extractBearerKey } from "../lib/auth-resolver";
import { parsePermissions, type McpScope } from "./scopes";

export type McpAuth = {
  readonly userId: string;
  readonly scope: McpScope;
};

export const resolveMcpAuth = async ({
  auth,
  headers,
}: {
  readonly auth: Auth;
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

  const scope = parsePermissions(result.key?.permissions);
  if (scope === undefined) {
    return undefined;
  }

  return { userId, scope };
};
