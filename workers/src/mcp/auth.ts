import type { Auth } from "../auth";
import { parsePermissions, type McpScope } from "./scopes";

export type McpAuth = {
  readonly userId: string;
  readonly scope: McpScope;
};

const BEARER_PREFIX = "bearer ";

const extractBearer = (headers: Headers): string | undefined => {
  const raw = headers.get("authorization");
  if (raw == null) {
    return undefined;
  }
  if (!raw.toLowerCase().startsWith(BEARER_PREFIX)) {
    return undefined;
  }
  const key = raw.slice(BEARER_PREFIX.length).trim();
  return key !== "" ? key : undefined;
};

export const resolveMcpAuth = async ({
  auth,
  headers,
}: {
  readonly auth: Auth;
  readonly headers: Headers;
}): Promise<McpAuth | undefined> => {
  const key = extractBearer(headers);
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
