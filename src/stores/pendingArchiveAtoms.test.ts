import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { atom, createStore } from "jotai";
import type { Atom } from "jotai";
import { getDb } from "@/lib/db/dexie";
import { SYNC_ACTION_TYPE } from "@/lib/constants";
import { createTestDoll, createTestGarment } from "@/test/factories";

const ARCHIVE_DELAY_MS = 5000;
const FIXED_NOW = new Date("2025-06-15T00:00:00Z").getTime();
const TOAST_ID = "toast-id-1";
const FLUSH_TIMEOUT_MS = 1000;
const FLUSH_POLL_INTERVAL_MS = 5;

type Store = ReturnType<typeof createStore>;

const sleep = async (ms: number): Promise<void> => {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
};

const waitForCondition = async (check: () => boolean): Promise<boolean> => {
  const deadline = Date.now() + FLUSH_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (check()) return true;
    await sleep(FLUSH_POLL_INTERVAL_MS);
  }
  return false;
};

const flushArchive = async (
  store: Store,
  pendingArchivesAtom: Atom<ReadonlyArray<{ readonly id: string }>>,
) => {
  // setTimeout コールバックを起動する
  vi.advanceTimersByTime(ARCHIVE_DELAY_MS);
  // Dexie の async 操作を解決させるため real timers に戻す
  vi.useRealTimers();
  const drained = await waitForCondition(
    () => store.get(pendingArchivesAtom).length === 0,
  );
  expect(drained, "pendingArchives drained").toBe(true);
};

// eslint-disable-next-line functional/no-mixed-types -- toast action callback is inherent to the toast model
type ToastAction = {
  readonly label: string;
  readonly onClick: () => void;
};

type ToastAddParams = {
  readonly message: string;
  readonly action?: ToastAction;
  readonly durationMs?: number;
};

const toastSpies = vi.hoisted(() => ({
  add: vi.fn<(params: ToastAddParams) => string>(),
  dismiss: vi.fn<(id: string) => void>(),
}));

const refreshSpies = vi.hoisted(() => ({
  garments: vi.fn<() => void>(),
  dolls: vi.fn<() => void>(),
}));

vi.mock("@/stores/toastAtoms", () => {
  const addToastAtom = atom(
    undefined,
    (_get, _set, params: ToastAddParams) => {
      toastSpies.add(params);
      return TOAST_ID;
    },
  );
  const dismissToastAtom = atom(undefined, (_get, _set, id: string) => {
    toastSpies.dismiss(id);
  });
  return { addToastAtom, dismissToastAtom };
});

vi.mock("@/stores/garmentAtoms", () => {
  const refreshGarmentsAtom = atom(undefined, () => {
    refreshSpies.garments();
  });
  return { refreshGarmentsAtom };
});

vi.mock("@/stores/dollAtoms", () => {
  const refreshDollsAtom = atom(undefined, () => {
    refreshSpies.dolls();
  });
  return { refreshDollsAtom };
});

const importAtoms = async () => await import("@/stores/pendingArchiveAtoms");

const getLastToastAction = (): ToastAction | undefined => {
  const lastCall = toastSpies.add.mock.calls.at(-1);
  return lastCall?.[0]?.action;
};

describe("pendingArchiveAtoms", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    vi.setSystemTime(FIXED_NOW);
    toastSpies.add.mockClear();
    toastSpies.dismiss.mockClear();
    refreshSpies.garments.mockClear();
    refreshSpies.dolls.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("requestArchiveAtom", () => {
    it("最初の request で toast 追加・pending 登録される", async () => {
      const { requestArchiveAtom, pendingArchivesAtom } = await importAtoms();
      const store = createStore();
      await getDb().garments.add(createTestGarment({ id: "g-1" }));

      store.set(requestArchiveAtom, { id: "g-1", entityType: "garment" });

      expect(toastSpies.add).toHaveBeenCalledTimes(1);
      const pending = store.get(pendingArchivesAtom);
      expect(pending).toHaveLength(1);
      expect(pending[0]?.id).toBe("g-1");
      expect(pending[0]?.entityType).toBe("garment");
      expect(pending[0]?.toastId).toBe(TOAST_ID);
    });

    it("同一 id・entityType の重複 request は無視される", async () => {
      const { requestArchiveAtom, pendingArchivesAtom } = await importAtoms();
      const store = createStore();
      await getDb().garments.add(createTestGarment({ id: "g-1" }));

      store.set(requestArchiveAtom, { id: "g-1", entityType: "garment" });
      store.set(requestArchiveAtom, { id: "g-1", entityType: "garment" });

      expect(toastSpies.add).toHaveBeenCalledTimes(1);
      expect(store.get(pendingArchivesAtom)).toHaveLength(1);
    });

    it("entityType が異なれば同一 id でも別 pending として登録される", async () => {
      const { requestArchiveAtom, pendingArchivesAtom } = await importAtoms();
      const store = createStore();
      await getDb().garments.add(createTestGarment({ id: "shared-id" }));
      await getDb().dolls.add(createTestDoll({ id: "shared-id" }));

      store.set(requestArchiveAtom, {
        id: "shared-id",
        entityType: "garment",
      });
      store.set(requestArchiveAtom, { id: "shared-id", entityType: "doll" });

      expect(store.get(pendingArchivesAtom)).toHaveLength(2);
      expect(toastSpies.add).toHaveBeenCalledTimes(2);
    });
  });

  describe("timeout 経過後の自動 archive", () => {
    it("garment: archivedAt が設定され、refreshGarmentsAtom が呼ばれる", async () => {
      const { requestArchiveAtom, pendingArchivesAtom } = await importAtoms();
      const store = createStore();
      await getDb().garments.add(
        createTestGarment({ id: "g-1", archivedAt: undefined }),
      );

      store.set(requestArchiveAtom, { id: "g-1", entityType: "garment" });
      const archiveTime = FIXED_NOW + ARCHIVE_DELAY_MS;
      await flushArchive(store, pendingArchivesAtom);

      const stored = await getDb().garments.get("g-1");
      expect(stored?.archivedAt).toBe(archiveTime);
      expect(stored?.updatedAt).toBe(archiveTime);
      expect(refreshSpies.garments).toHaveBeenCalledTimes(1);
      expect(refreshSpies.dolls).not.toHaveBeenCalled();

      const queued = await getDb().syncQueue.toArray();
      expect(queued).toHaveLength(1);
      expect(queued[0]?.type).toBe(SYNC_ACTION_TYPE.GARMENT_UPDATE);
    });

    it("doll: archivedAt が設定され、refreshDollsAtom が呼ばれる", async () => {
      const { requestArchiveAtom, pendingArchivesAtom } = await importAtoms();
      const store = createStore();
      await getDb().dolls.add(
        createTestDoll({ id: "d-1", archivedAt: undefined }),
      );

      store.set(requestArchiveAtom, { id: "d-1", entityType: "doll" });
      const archiveTime = FIXED_NOW + ARCHIVE_DELAY_MS;
      await flushArchive(store, pendingArchivesAtom);

      const stored = await getDb().dolls.get("d-1");
      expect(stored?.archivedAt).toBe(archiveTime);
      expect(refreshSpies.dolls).toHaveBeenCalledTimes(1);
      expect(refreshSpies.garments).not.toHaveBeenCalled();

      const queued = await getDb().syncQueue.toArray();
      expect(queued).toHaveLength(1);
      expect(queued[0]?.type).toBe(SYNC_ACTION_TYPE.DOLL_UPDATE);
    });

    it("対象エンティティが DB に存在しない場合は syncQueue に追加されない", async () => {
      const { requestArchiveAtom, pendingArchivesAtom } = await importAtoms();
      const store = createStore();

      store.set(requestArchiveAtom, {
        id: "missing-id",
        entityType: "garment",
      });
      await flushArchive(store, pendingArchivesAtom);

      const queued = await getDb().syncQueue.toArray();
      expect(queued).toHaveLength(0);
      expect(refreshSpies.garments).toHaveBeenCalledTimes(1);
    });
  });

  describe("cancel via toast action", () => {
    it("toast の onClick で cancel すると timer がクリアされ archive されない", async () => {
      const { requestArchiveAtom, pendingArchivesAtom } = await importAtoms();
      const store = createStore();
      await getDb().garments.add(createTestGarment({ id: "g-1" }));

      store.set(requestArchiveAtom, { id: "g-1", entityType: "garment" });

      const action = getLastToastAction();
      action?.onClick();

      expect(toastSpies.dismiss).toHaveBeenCalledWith(TOAST_ID);
      expect(store.get(pendingArchivesAtom)).toHaveLength(0);

      await vi.advanceTimersByTimeAsync(ARCHIVE_DELAY_MS);
      const stored = await getDb().garments.get("g-1");
      expect(stored?.archivedAt).toBeUndefined();
      expect(refreshSpies.garments).not.toHaveBeenCalled();
    });

    it("pending に存在しない id の cancel では dismiss が呼ばれない", async () => {
      const { requestArchiveAtom, pendingArchivesAtom } = await importAtoms();
      const store = createStore();
      await getDb().garments.add(createTestGarment({ id: "g-1" }));

      store.set(requestArchiveAtom, { id: "g-1", entityType: "garment" });

      const action = getLastToastAction();
      action?.onClick();
      toastSpies.dismiss.mockClear();

      // すでに pending に存在しないので二度目の onClick はガードされる
      action?.onClick();
      expect(toastSpies.dismiss).not.toHaveBeenCalled();
      expect(store.get(pendingArchivesAtom)).toHaveLength(0);
    });
  });
});
