import { atom } from "jotai";
import { db } from "@/lib/db/dexie";
import { SYNC_STATUS } from "@/lib/constants";
import type { SyncStatusValue } from "@/lib/constants";

export const syncStatusAtom = atom<SyncStatusValue>(SYNC_STATUS.IDLE);

export const pendingSyncCountAtom = atom(async () => {
  const count = await db.syncQueue.count();
  return count;
});
