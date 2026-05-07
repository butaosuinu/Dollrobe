"use client";

import { atom } from "jotai";
import { trpcClient } from "@/lib/trpc";

const digestRefreshTriggerAtom = atom(0);

export const latestDigestAtom = atom(async (get) =>
  typeof window === "undefined"
    ? undefined
    : (get(digestRefreshTriggerAtom),
      await trpcClient.digest.latest.query().catch(() => undefined)),
);

export const digestListAtom = atom(async (get) =>
  typeof window === "undefined"
    ? []
    : (get(digestRefreshTriggerAtom),
      await trpcClient.digest.list.query({ limit: 10 }).catch(() => [])),
);

export const hasUnreadDigestAtom = atom(async (get) => {
  if (typeof window === "undefined") return false;
  get(digestRefreshTriggerAtom);
  const result = await trpcClient.digest.hasUnread
    .query()
    .catch(() => ({ hasUnread: false as const }));
  return result.hasUnread;
});

export const markDigestReadAtom = atom(
  undefined,
  async (_get, set, id: string) => {
    await trpcClient.digest.markRead.mutate({ id });
    set(digestRefreshTriggerAtom, (prev) => prev + 1);
  },
);

export const refreshDigestAtom = atom(undefined, (_get, set) => {
  set(digestRefreshTriggerAtom, (prev) => prev + 1);
});
