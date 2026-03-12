import { createMiddleware } from "hono/factory";
import type { Env } from "../types";

export const authMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  await next();
});
