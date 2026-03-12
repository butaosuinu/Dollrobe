import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCJotai } from "jotai-trpc";
import type { AppRouter } from "../../workers/src/trpc/router";

const WORKERS_URL = process.env.NEXT_PUBLIC_WORKERS_URL ?? "http://localhost:8787";

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${WORKERS_URL}/trpc`,
    }),
  ],
});

export const trpc = createTRPCJotai<AppRouter>({
  links: [
    httpBatchLink({
      url: `${WORKERS_URL}/trpc`,
    }),
  ],
});
