import type Dexie from "dexie";
import { atom } from "jotai";
import type { Atom, WritableAtom } from "jotai";
import { getDb } from "@/lib/db/dexie";
import { currentUserIdAtom } from "@/stores/authAtoms";

type SyncActionTypes = {
  readonly create: string;
  readonly update: string;
  readonly delete: string;
};

type EntityAtoms<T> = {
  readonly dataAtom: Atom<Promise<T[]>>;
  readonly refreshAtom: WritableAtom<undefined, [], void>;
  readonly addAtom: WritableAtom<undefined, [T], Promise<void>>;
  readonly updateAtom: WritableAtom<undefined, [T], Promise<void>>;
  readonly deleteAtom: WritableAtom<undefined, [string], Promise<void>>;
};

export const createEntityAtoms = <T extends { readonly userId: string }>(
  getTable: () => Dexie.Table<T, string>,
  syncActionTypes: SyncActionTypes,
): EntityAtoms<T> => {
  const refreshTriggerAtom = atom(0);

  const dataAtom = atom(async (get) => {
    if (typeof indexedDB === "undefined") return [] satisfies T[] as T[];
    get(refreshTriggerAtom);
    const userId = get(currentUserIdAtom);
    return userId === undefined
      ? ([] satisfies T[] as T[])
      : await getTable().where("userId").equals(userId).toArray();
  });

  const refreshAtom = atom(undefined, (_get, set) => {
    set(refreshTriggerAtom, (prev) => prev + 1);
  });

  const addAtom = atom(undefined, async (_get, set, item: T) => {
    await getTable().add(item);
    await getDb().syncQueue.add({
      type: syncActionTypes.create,
      payload: item,
      createdAt: Date.now(),
    });
    set(refreshAtom);
  });

  const updateAtom = atom(undefined, async (_get, set, item: T) => {
    await getTable().put(item);
    await getDb().syncQueue.add({
      type: syncActionTypes.update,
      payload: item,
      createdAt: Date.now(),
    });
    set(refreshAtom);
  });

  const deleteAtom = atom(undefined, async (_get, set, id: string) => {
    await getTable().delete(id);
    await getDb().syncQueue.add({
      type: syncActionTypes.delete,
      payload: { id },
      createdAt: Date.now(),
    });
    set(refreshAtom);
  });

  return { dataAtom, refreshAtom, addAtom, updateAtom, deleteAtom };
};

type Restorable = {
  readonly id: string;
  readonly archivedAt: number | undefined;
  readonly updatedAt: number;
};

export const createRestoreAtom = (
  getTable: () => Dexie.Table<Restorable, string>,
  refreshAtom: WritableAtom<undefined, [], void>,
  syncUpdateType: string,
) =>
  atom(undefined, async (_get, set, id: string) => {
    const now = Date.now();
    await getTable().update(id, { archivedAt: undefined, updatedAt: now });
    const updated = await getTable().get(id);
    await (updated === undefined
      ? Promise.resolve()
      : getDb().syncQueue.add({
          type: syncUpdateType,
          payload: updated,
          createdAt: now,
        }));
    set(refreshAtom);
  });
