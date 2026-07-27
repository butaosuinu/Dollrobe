import { APIError, createAuthMiddleware } from "better-auth/api";
import { z } from "zod";
import {
  API_KEY_SCOPE,
  buildStoredApiKeyPermissions,
} from "./api-key-permissions";

const apiKeyPermissionsSchema = z.union([
  z.object({ all: z.tuple([z.literal(API_KEY_SCOPE.READ)]) }).strict(),
  z
    .object({
      all: z.tuple([
        z.literal(API_KEY_SCOPE.READ),
        z.literal(API_KEY_SCOPE.WRITE),
      ]),
    })
    .strict(),
]);

const API_KEY_PREFIX_CHARACTERS =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-";

const apiKeyCreateBodySchema = z
  .object({
    configId: z.string().optional(),
    name: z.string().optional(),
    expiresIn: z.number().min(1).nullable().optional(),
    prefix: z
      .string()
      .refine((value) =>
        Array.from(value).every((character) =>
          API_KEY_PREFIX_CHARACTERS.includes(character),
        ),
      )
      .optional(),
    remaining: z.null().optional(),
    metadata: z.unknown().optional(),
    permissions: apiKeyPermissionsSchema.optional(),
    organizationId: z.string().optional(),
  })
  .strict();

type StoredApiKeyPermissions = ReturnType<typeof buildStoredApiKeyPermissions>;

export const createApiKeyCreateRequestPolicy = () => {
  const permissionsByRequest = new WeakMap<Request, StoredApiKeyPermissions>();

  const before = createAuthMiddleware(async (ctx) => {
    if (ctx.path !== "/api-key/create" || ctx.request === undefined) {
      return;
    }

    const parsed = await apiKeyCreateBodySchema.safeParseAsync(ctx.body);
    if (!parsed.success) {
      throw new APIError("BAD_REQUEST", {
        code: "INVALID_API_KEY_CREATE_BODY",
        message: "Invalid API key create request",
      });
    }

    const actions = parsed.data.permissions?.all ?? [API_KEY_SCOPE.READ];
    permissionsByRequest.set(
      ctx.request,
      buildStoredApiKeyPermissions(actions),
    );

    // permissions は Better Auth が server-only として扱うため、HTTP body から
    // 除去し、下の defaultPermissions 経由でのみ保存する。
    // Better Auth の middleware context は body の書き換えを契約として公開する。
    // eslint-disable-next-line functional/immutable-data, no-param-reassign -- upstream middleware context contract
    ctx.body.permissions = undefined;
  });

  return {
    before,
    getPermissions: (request: Request | undefined): StoredApiKeyPermissions =>
      request === undefined
        ? buildStoredApiKeyPermissions([API_KEY_SCOPE.READ])
        : (permissionsByRequest.get(request) ??
          buildStoredApiKeyPermissions([API_KEY_SCOPE.READ])),
  };
};
