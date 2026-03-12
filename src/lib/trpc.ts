import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCJotai } from "jotai-trpc";
import type { AppRouter } from "../../workers/src/trpc/router";

const WORKERS_URL =
  process.env.NEXT_PUBLIC_WORKERS_URL ?? "http://localhost:8787";

const createLink = () =>
  httpBatchLink({
    url: `${WORKERS_URL}/trpc`,
    fetch: async (url, options) =>
      await fetch(url, { ...options, credentials: "include" }),
  });

export const trpcClient = createTRPCClient<AppRouter>({
  links: [createLink()],
});

export const trpc = createTRPCJotai<AppRouter>({
  links: [createLink()],
});
