import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStore } from "jotai";
import { getDb } from "@/lib/db/dexie";
import { SYNC_ACTION_TYPE } from "@/lib/constants";
import { createTestDoll, createTestGarment, FIXED_NOW } from "@/test/factories";
import { setupCuid2 } from "@/test/mocks/modules/cuid2";
import {
  pendingArchivesAtom,
  requestArchiveAtom,
} from "@/stores/pendingArchiveAtoms";
import { toastsAtom } from "@/stores/toastAtoms";

const ARCHIVE_DELAY_MS = 5000;
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

const flushArchive = async (store: Store) => {
  // setTimeout コールバックを起動する
  vi.advanceTimersByTime(ARCHIVE_DELAY_MS);
  // Dexie の async 操作を解決させるため real timers に戻す
  vi.useRealTimers();
  const drained = await waitForCondition(
    () => store.get(pendingArchivesAtom).length === 0,
  );
  expect(drained, "pendingArchives drained").toBe(true);
};

const lastToastAction = (
  store: Store,
): { readonly onClick: () => void } | undefined =>
  store.get(toastsAtom).at(-1)?.action;

describe("pendingArchiveAtoms", () => {
  beforeEach(() => {
    // 複数 toast が共存するテストで cuid 衝突を避けるため sequential を使う
    setupCuid2({ mode: "sequential" });
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("requestArchiveAtom", () => {
    it("最初の request で toast 追加・pending 登録される", async () => {
      const store = createStore();
      await getDb().garments.add(createTestGarment({ id: "g-1" }));

      store.set(requestArchiveAtom, { id: "g-1", entityType: "garment" });

      const toasts = store.get(toastsAtom);
      expect(toasts).toHaveLength(1);
      const pending = store.get(pendingArchivesAtom);
      expect(pending).toHaveLength(1);
      expect(pending[0]?.id).toBe("g-1");
      expect(pending[0]?.entityType).toBe("garment");
      expect(pending[0]?.toastId).toBe(toasts[0]?.id);
    });

    it("同一 id・entityType の重複 request は無視される", async () => {
      const store = createStore();
      await getDb().garments.add(createTestGarment({ id: "g-1" }));

      store.set(requestArchiveAtom, { id: "g-1", entityType: "garment" });
      store.set(requestArchiveAtom, { id: "g-1", entityType: "garment" });

      expect(store.get(toastsAtom)).toHaveLength(1);
      expect(store.get(pendingArchivesAtom)).toHaveLength(1);
    });

    it("entityType が異なれば同一 id でも別 pending として登録される", async () => {
      const store = createStore();
      await getDb().garments.add(createTestGarment({ id: "shared-id" }));
      await getDb().dolls.add(createTestDoll({ id: "shared-id" }));

      store.set(requestArchiveAtom, {
        id: "shared-id",
        entityType: "garment",
      });
      store.set(requestArchiveAtom, { id: "shared-id", entityType: "doll" });

      expect(store.get(pendingArchivesAtom)).toHaveLength(2);
      expect(store.get(toastsAtom)).toHaveLength(2);
    });
  });

  describe("timeout 経過後の自動 archive", () => {
    it("garment: archivedAt が設定され、syncQueue に GARMENT_UPDATE が積まれる", async () => {
      const store = createStore();
      await getDb().garments.add(
        createTestGarment({ id: "g-1", archivedAt: undefined }),
      );

      store.set(requestArchiveAtom, { id: "g-1", entityType: "garment" });
      const archiveTime = FIXED_NOW + ARCHIVE_DELAY_MS;
      await flushArchive(store);

      const stored = await getDb().garments.get("g-1");
      expect(stored?.archivedAt).toBe(archiveTime);
      expect(stored?.updatedAt).toBe(archiveTime);

      const queued = await getDb().syncQueue.toArray();
      expect(queued).toHaveLength(1);
      expect(queued[0]?.type).toBe(SYNC_ACTION_TYPE.GARMENT_UPDATE);
    });

    it("doll: archivedAt が設定され、syncQueue に DOLL_UPDATE が積まれる", async () => {
      const store = createStore();
      await getDb().dolls.add(
        createTestDoll({ id: "d-1", archivedAt: undefined }),
      );

      store.set(requestArchiveAtom, { id: "d-1", entityType: "doll" });
      const archiveTime = FIXED_NOW + ARCHIVE_DELAY_MS;
      await flushArchive(store);

      const stored = await getDb().dolls.get("d-1");
      expect(stored?.archivedAt).toBe(archiveTime);

      const queued = await getDb().syncQueue.toArray();
      expect(queued).toHaveLength(1);
      expect(queued[0]?.type).toBe(SYNC_ACTION_TYPE.DOLL_UPDATE);
    });

    it("対象エンティティが DB に存在しない場合は syncQueue に追加されない", async () => {
      const store = createStore();

      store.set(requestArchiveAtom, {
        id: "missing-id",
        entityType: "garment",
      });
      await flushArchive(store);

      const queued = await getDb().syncQueue.toArray();
      expect(queued).toHaveLength(0);
    });
  });

  describe("cancel via toast action", () => {
    it("toast の onClick で cancel すると timer がクリアされ archive されない", async () => {
      const store = createStore();
      await getDb().garments.add(createTestGarment({ id: "g-1" }));

      store.set(requestArchiveAtom, { id: "g-1", entityType: "garment" });

      const action = lastToastAction(store);
      action?.onClick();

      expect(store.get(toastsAtom)).toHaveLength(0);
      expect(store.get(pendingArchivesAtom)).toHaveLength(0);

      await vi.advanceTimersByTimeAsync(ARCHIVE_DELAY_MS);
      const stored = await getDb().garments.get("g-1");
      expect(stored?.archivedAt).toBeUndefined();
      expect(await getDb().syncQueue.count()).toBe(0);
    });

    it("pending に存在しない id の cancel では toast / pending の状態が変わらない", async () => {
      const store = createStore();
      await getDb().garments.add(createTestGarment({ id: "g-1" }));

      store.set(requestArchiveAtom, { id: "g-1", entityType: "garment" });

      const action = lastToastAction(store);
      action?.onClick();
      expect(store.get(toastsAtom)).toHaveLength(0);

      // すでに pending に存在しないので二度目の onClick はガードされる
      action?.onClick();
      expect(store.get(toastsAtom)).toHaveLength(0);
      expect(store.get(pendingArchivesAtom)).toHaveLength(0);
    });
  });
});
