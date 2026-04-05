import { atom } from "jotai";
import { getDb } from "@/lib/db/dexie";
import { SYNC_ACTION_TYPE } from "@/lib/constants";
import type { Doll } from "@/types";
import { createEntityAtoms, createRestoreAtom } from "./createEntityAtoms";

const {
  dataAtom: dollsAtom,
  refreshAtom: refreshDollsAtom,
  addAtom: addDollAtom,
  updateAtom: updateDollAtom,
  deleteAtom: deleteDollAtom,
} = createEntityAtoms<Doll>(() => getDb().dolls, {
  create: SYNC_ACTION_TYPE.DOLL_CREATE,
  update: SYNC_ACTION_TYPE.DOLL_UPDATE,
  delete: SYNC_ACTION_TYPE.DOLL_DELETE,
});

export {
  dollsAtom,
  refreshDollsAtom,
  addDollAtom,
  updateDollAtom,
  deleteDollAtom,
};

export const restoreDollAtom = createRestoreAtom(
  () => getDb().dolls,
  refreshDollsAtom,
  SYNC_ACTION_TYPE.DOLL_UPDATE,
);

export const selectedDollIdAtom = atom<string | undefined>(undefined);
