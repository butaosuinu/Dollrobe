import { atom } from "jotai";
import { db } from "@/lib/db/dexie";
import { SYNC_ACTION_TYPE } from "@/lib/constants";
import { addToastAtom, dismissToastAtom } from "@/stores/toastAtoms";
import { refreshGarmentsAtom } from "@/stores/garmentAtoms";
import { refreshDollsAtom } from "@/stores/dollAtoms";

type PendingArchiveEntityType = "garment" | "doll";

type PendingArchive = {
  readonly id: string;
  readonly entityType: PendingArchiveEntityType;
  readonly toastId: string;
  readonly timerId: ReturnType<typeof setTimeout>;
};

const ARCHIVE_DELAY_MS = 5000;

export const pendingArchivesAtom = atom<readonly PendingArchive[]>([]);

const removePending = (
  prev: readonly PendingArchive[],
  id: string,
  entityType: PendingArchiveEntityType,
) => prev.filter((p) => !(p.id === id && p.entityType === entityType));

const archiveEntity = async (
  entityType: PendingArchiveEntityType,
  id: string,
  now: number,
) => {
  const table = entityType === "garment" ? db.garments : db.dolls;
  const syncType =
    entityType === "garment"
      ? SYNC_ACTION_TYPE.GARMENT_UPDATE
      : SYNC_ACTION_TYPE.DOLL_UPDATE;

  await table.update(id, { archivedAt: now, updatedAt: now });
  const updated = await table.get(id);
  await (updated === undefined
    ? Promise.resolve()
    : db.syncQueue.add({
        type: syncType,
        payload: updated,
        createdAt: now,
      }));
};

/* eslint-disable functional/no-conditional-statements -- archive orchestration requires imperative control flow */
const executeArchiveAtom = atom(
  undefined,
  async (
    get,
    set,
    {
      id,
      entityType,
    }: { readonly id: string; readonly entityType: PendingArchiveEntityType },
  ) => {
    const isPending =
      get(pendingArchivesAtom).find(
        (p) => p.id === id && p.entityType === entityType,
      ) !== undefined;

    if (isPending) {
      await archiveEntity(entityType, id, Date.now());
      if (entityType === "garment") {
        set(refreshGarmentsAtom);
      } else {
        set(refreshDollsAtom);
      }
    }

    set(pendingArchivesAtom, (prev) => removePending(prev, id, entityType));
  },
);

const cancelArchiveAtom = atom(
  undefined,
  (
    get,
    set,
    {
      id,
      entityType,
    }: { readonly id: string; readonly entityType: PendingArchiveEntityType },
  ) => {
    const pending = get(pendingArchivesAtom).find(
      (p) => p.id === id && p.entityType === entityType,
    );

    if (pending !== undefined) {
      clearTimeout(pending.timerId);
      set(dismissToastAtom, pending.toastId);
      set(pendingArchivesAtom, (prev) => removePending(prev, id, entityType));
    }
  },
);

export const requestArchiveAtom = atom(
  undefined,
  (
    get,
    set,
    {
      id,
      entityType,
    }: { readonly id: string; readonly entityType: PendingArchiveEntityType },
  ) => {
    const alreadyPending =
      get(pendingArchivesAtom).find(
        (p) => p.id === id && p.entityType === entityType,
      ) !== undefined;
    if (alreadyPending) return;

    const toastId = set(addToastAtom, {
      message: "アーカイブしました",
      durationMs: ARCHIVE_DELAY_MS,
      action: {
        label: "取り消す",
        onClick: () => {
          set(cancelArchiveAtom, { id, entityType });
        },
      },
    });

    const timerId = setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises -- delayed execution by design
      set(executeArchiveAtom, { id, entityType });
    }, ARCHIVE_DELAY_MS);

    set(pendingArchivesAtom, (prev) => [
      ...prev,
      { id, entityType, toastId, timerId },
    ]);
  },
);
/* eslint-enable functional/no-conditional-statements */
