import { http, HttpResponse } from "msw";
import { registerDefaultTrpcHandlers } from "./trpc/defaults";
import { trpcDispatcherHandlers } from "./trpc/handlerFactory";

registerDefaultTrpcHandlers();

type SessionUserRole = "admin" | "user";

type MockSessionUser = {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly image: string | null;
  readonly emailVerified: boolean;
  readonly role: SessionUserRole;
  readonly frozen: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
};

const DEFAULT_SESSION_USER: MockSessionUser = {
  id: "user-1",
  name: "テストユーザー",
  email: "test@example.com",
  image: null,
  emailVerified: false,
  role: "user",
  frozen: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const handlers = [
  http.get("*/api/auth/get-session", () =>
    HttpResponse.json({ user: DEFAULT_SESSION_USER }),
  ),
  ...trpcDispatcherHandlers,
];

export const adminSessionHandler = http.get("*/api/auth/get-session", () =>
  HttpResponse.json({
    user: { ...DEFAULT_SESSION_USER, id: "admin-1", role: "admin" },
  }),
);

export const frozenSessionHandler = http.get("*/api/auth/get-session", () =>
  HttpResponse.json({
    user: { ...DEFAULT_SESSION_USER, frozen: true },
  }),
);

type SessionOverrides = Partial<MockSessionUser>;

export const sessionHandler = (overrides: SessionOverrides) =>
  http.get("*/api/auth/get-session", () =>
    HttpResponse.json({ user: { ...DEFAULT_SESSION_USER, ...overrides } }),
  );

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
