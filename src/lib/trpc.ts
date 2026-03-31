import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCJotai } from "jotai-trpc";
import type { AppRouter } from "../../workers/src/trpc/router";
import { WORKERS_URL_FOR_FETCH } from "@/lib/workersUrl";

const createLink = () =>
  httpBatchLink({
    url: `${WORKERS_URL_FOR_FETCH}/trpc`,
    fetch: async (url, options) =>
      await fetch(url, { ...options, credentials: "include" }),
  });

export const trpcClient = createTRPCClient<AppRouter>({
  links: [createLink()],
});

export const trpc = createTRPCJotai<AppRouter>({
  links: [createLink()],
});
