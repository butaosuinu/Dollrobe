import { atom } from "jotai";

export const activeLocationIdAtom = atom<string | undefined>(undefined);

export const scannedGarmentIdsAtom = atom<readonly string[]>([]);

export const reviewDialogOpenAtom = atom<boolean>(false);

export const resetScanSessionAtom = atom(undefined, (_get, set) => {
  set(activeLocationIdAtom, undefined);
  set(scannedGarmentIdsAtom, []);
  set(reviewDialogOpenAtom, false);
});
