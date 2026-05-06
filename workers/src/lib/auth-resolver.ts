import type { Auth } from "../auth";

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

export const resolveAuthenticatedUserId = async ({
  auth,
  headers,
}: {
  readonly auth: Auth;
  readonly headers: Headers;
}): Promise<string | undefined> => {
  const bearer = extractBearerKey(headers);
  const hasCookie = headers.get("cookie") !== null;

  if (bearer !== undefined && !hasCookie) {
    return await verifyBearer({ auth, key: bearer });
  }

  const session = await auth.api.getSession({ headers }).catch(() => undefined);
  const sessionUserId = session?.user.id;
  if (sessionUserId !== undefined && sessionUserId !== "") {
    return sessionUserId;
  }

  if (bearer === undefined) {
    return undefined;
  }
  return await verifyBearer({ auth, key: bearer });
};
