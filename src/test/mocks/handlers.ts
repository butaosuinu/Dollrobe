import { http, HttpResponse } from "msw";
import { registerDefaultTrpcHandlers } from "./trpc/defaults";
import { trpcDispatcherHandlers } from "./trpc/handlerFactory";

registerDefaultTrpcHandlers();

export const handlers = [
  http.get("*/api/auth/get-session", () =>
    HttpResponse.json({
      user: {
        id: "user-1",
        name: "テストユーザー",
        email: "test@example.com",
        image: null,
        emailVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }),
  ),
  ...trpcDispatcherHandlers,
];

export const unauthenticatedHandler = http.get("*/api/auth/get-session", () =>
  HttpResponse.json(null),
);

// transient なバックエンドエラー（5xx）をシミュレートする。better-auth の
// client は { data: null, error } で resolve するパスと、エラー時に reject
// するパスがあるため、500 を返して error フィールドを伝播させる。
export const sessionFetchFailureHandler = http.get(
  "*/api/auth/get-session",
  () =>
    HttpResponse.json(
      { code: "INTERNAL_SERVER_ERROR", message: "transient failure" },
      { status: 500 },
    ),
);
