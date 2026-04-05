import { atom } from "jotai";
import { getDb } from "@/lib/db/dexie";
import { SYNC_ACTION_TYPE } from "@/lib/constants";
import { ssrSuspend } from "@/lib/suspense-never";
import type { Doll } from "@/types";

const dollsRefreshTriggerAtom = atom(0);

export const dollsAtom = atom(async (get) =>
  typeof indexedDB === "undefined"
    ? await ssrSuspend([] satisfies Doll[])
    : (get(dollsRefreshTriggerAtom), await getDb().dolls.toArray()),
);

export const refreshDollsAtom = atom(undefined, (_get, set) => {
  set(dollsRefreshTriggerAtom, (prev) => prev + 1);
});

export const addDollAtom = atom(undefined, async (_get, set, doll: Doll) => {
  await getDb().dolls.add(doll);
  await getDb().syncQueue.add({
    type: SYNC_ACTION_TYPE.DOLL_CREATE,
    payload: doll,
    createdAt: Date.now(),
  });
  set(refreshDollsAtom);
});

export const updateDollAtom = atom(undefined, async (_get, set, doll: Doll) => {
  await getDb().dolls.put(doll);
  await getDb().syncQueue.add({
    type: SYNC_ACTION_TYPE.DOLL_UPDATE,
    payload: doll,
    createdAt: Date.now(),
  });
  set(refreshDollsAtom);
});

export const deleteDollAtom = atom(undefined, async (_get, set, id: string) => {
  await getDb().dolls.delete(id);
  await getDb().syncQueue.add({
    type: SYNC_ACTION_TYPE.DOLL_DELETE,
    payload: { id },
    createdAt: Date.now(),
  });
  set(refreshDollsAtom);
});

export const restoreDollAtom = atom(
  undefined,
  async (_get, set, id: string) => {
    const now = Date.now();
    await getDb().dolls.update(id, { archivedAt: undefined, updatedAt: now });
    const updated = await getDb().dolls.get(id);
    await (updated === undefined
      ? Promise.resolve()
      : getDb().syncQueue.add({
          type: SYNC_ACTION_TYPE.DOLL_UPDATE,
          payload: updated,
          createdAt: now,
        }));
    set(refreshDollsAtom);
  },
);

export const selectedDollIdAtom = atom<string | undefined>(undefined);
