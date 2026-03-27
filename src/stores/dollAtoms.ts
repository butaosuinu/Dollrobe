import { atom } from "jotai";
import { db } from "@/lib/db/dexie";
import { SYNC_ACTION_TYPE } from "@/lib/constants";
import type { Doll } from "@/types";

const dollsRefreshTriggerAtom = atom(0);

export const dollsAtom = atom(async (get) => {
  get(dollsRefreshTriggerAtom);
  const dolls = await db.dolls.toArray();
  return dolls;
});

export const refreshDollsAtom = atom(undefined, (_get, set) => {
  set(dollsRefreshTriggerAtom, (prev) => prev + 1);
});

export const addDollAtom = atom(undefined, async (_get, set, doll: Doll) => {
  await db.dolls.add(doll);
  await db.syncQueue.add({
    type: SYNC_ACTION_TYPE.DOLL_CREATE,
    payload: doll,
    createdAt: Date.now(),
  });
  set(refreshDollsAtom);
});

export const updateDollAtom = atom(undefined, async (_get, set, doll: Doll) => {
  await db.dolls.put(doll);
  await db.syncQueue.add({
    type: SYNC_ACTION_TYPE.DOLL_UPDATE,
    payload: doll,
    createdAt: Date.now(),
  });
  set(refreshDollsAtom);
});

export const deleteDollAtom = atom(undefined, async (_get, set, id: string) => {
  await db.dolls.delete(id);
  await db.syncQueue.add({
    type: SYNC_ACTION_TYPE.DOLL_DELETE,
    payload: { id },
    createdAt: Date.now(),
  });
  set(refreshDollsAtom);
});

export const selectedDollIdAtom = atom<string | undefined>(undefined);
