import { http, HttpResponse } from "msw";
import { server } from "@/test/mocks/server";

type SetupAuthSessionInput = {
  readonly userId: string;
  readonly name?: string;
  readonly email?: string;
};

export const setupAuthSession = ({
  userId,
  name = "テストユーザー",
  email = "test@example.com",
}: SetupAuthSessionInput): void => {
  server.use(
    http.get("*/api/auth/get-session", () =>
      HttpResponse.json({
        user: {
          id: userId,
          name,
          email,
          image: null,
          emailVerified: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
    ),
  );
};
