import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/trpc/*", () => HttpResponse.json({ result: { data: [] } })),
];
