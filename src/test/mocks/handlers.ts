import { http, HttpResponse } from "msw";
import {
  registerDefaultTrpcHandlers,
  trpcDispatcherHandlers,
} from "./trpc/index";

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
