"use client";

import { atom } from "jotai";
import { trpcClient } from "@/lib/trpc";

const digestRefreshTriggerAtom = atom(0);

export const latestDigestAtom = atom(async (get) => {
  get(digestRefreshTriggerAtom);
  return await trpcClient.digest.latest.query();
});

export const digestListAtom = atom(async (get) => {
  get(digestRefreshTriggerAtom);
  return await trpcClient.digest.list.query({ limit: 10 });
});

export const hasUnreadDigestAtom = atom(async (get) => {
  get(digestRefreshTriggerAtom);
  const result = await trpcClient.digest.hasUnread.query();
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
