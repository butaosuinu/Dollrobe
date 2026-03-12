import { atom } from "jotai";
import { db } from "@/lib/db/dexie";

export type SyncStatus = "idle" | "syncing" | "error";

export const syncStatusAtom = atom<SyncStatus>("idle");

export const pendingSyncCountAtom = atom(async () => {
  const count = await db.syncQueue.count();
  return count;
});
