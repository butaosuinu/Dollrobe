import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { atom, createStore } from "jotai";
import { SYNC_ACTION_TYPE, SYNC_STATUS } from "@/lib/constants";
import { getDb } from "@/lib/db/dexie";
import {
  createTestDoll,
  createTestGarment,
  createTestStorageCase,
  createTestStorageLocation,
  FIXED_NOW,
} from "@/test/factories";
import { server } from "@/test/mocks/server";
import {
  trpcMutation,
  trpcQuery,
  type RouterOutputs,
} from "@/test/mocks/trpc/handlerFactory";

const pushSpy = vi.fn();
const pullSpy = vi.fn();

type PullPayload = RouterOutputs["sync.pull"];

const installSync = ({
  push,
  pull,
}: {
  readonly push?:
    | { readonly resolve: { success: true; processedCount: number } }
    | { readonly throwError: unknown };
  readonly pull?:
    | { readonly resolve: PullPayload }
    | { readonly throwError: unknown };
}) => {
  server.use(
    trpcMutation("sync.push", async ({ input }) => {
      pushSpy(input);
      if (push !== undefined && "throwError" in push) {
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- intentional non-Error rejection passthrough
        return await Promise.reject(push.throwError);
      }
      return push?.resolve ?? { success: true as const, processedCount: 0 };
    }),
    trpcQuery("sync.pull", async () => {
      pullSpy();
      if (pull !== undefined && "throwError" in pull) {
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- intentional non-Error rejection passthrough
        return await Promise.reject(pull.throwError);
      }
      return pull?.resolve ?? emptyServerState();
    }),
  );
};

const refreshSpies = vi.hoisted(() => ({
  coordinates: vi.fn(),
  dolls: vi.fn(),
  garments: vi.fn(),
  storageCases: vi.fn(),
  storageLocations: vi.fn(),
}));

vi.mock("@/stores/coordinateAtoms", async () => {
  const actual = await vi.importActual<
    typeof import("@/stores/coordinateAtoms")
  >("@/stores/coordinateAtoms");
  return {
    ...actual,
    refreshCoordinatesAtom: atom(undefined, () => {
      refreshSpies.coordinates();
    }),
  };
});

vi.mock("@/stores/dollAtoms", async () => {
  const actual =
    await vi.importActual<typeof import("@/stores/dollAtoms")>(
      "@/stores/dollAtoms",
    );
  return {
    ...actual,
    refreshDollsAtom: atom(undefined, () => {
      refreshSpies.dolls();
    }),
  };
});

vi.mock("@/stores/garmentAtoms", async () => {
  const actual = await vi.importActual<typeof import("@/stores/garmentAtoms")>(
    "@/stores/garmentAtoms",
  );
  return {
    ...actual,
    refreshGarmentsAtom: atom(undefined, () => {
      refreshSpies.garments();
    }),
  };
});

vi.mock("@/stores/locationAtoms", async () => {
  const actual = await vi.importActual<typeof import("@/stores/locationAtoms")>(
    "@/stores/locationAtoms",
  );
  return {
    ...actual,
    refreshStorageCasesAtom: atom(undefined, () => {
      refreshSpies.storageCases();
    }),
    refreshStorageLocationsAtom: atom(undefined, () => {
      refreshSpies.storageLocations();
    }),
  };
});

const importSyncAtoms = async () => await import("@/stores/syncAtoms");

const emptyServerState = () => ({
  garments: [],
  dolls: [],
  coordinates: [],
  storageCases: [],
  storageLocations: [],
});

describe("syncAtoms", () => {
  beforeEach(() => {
    pushSpy.mockReset();
    pullSpy.mockReset();
    refreshSpies.coordinates.mockReset();
    refreshSpies.dolls.mockReset();
    refreshSpies.garments.mockReset();
    refreshSpies.storageCases.mockReset();
    refreshSpies.storageLocations.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("executeSyncAtom", () => {
    it(
      "push と pull が成功すると refresh atom がすべて呼ばれ、状態が IDLE に戻る",
      { timeout: 15_000 },
      async () => {
        installSync({});

        await getDb().syncQueue.bulkAdd([
          {
            type: SYNC_ACTION_TYPE.GARMENT_CREATE,
            payload: { id: "g-1" },
            createdAt: FIXED_NOW,
          },
        ]);

        const store = createStore();
        const { executeSyncAtom, syncStatusAtom, lastSyncErrorAtom } =
          await importSyncAtoms();

        await store.set(executeSyncAtom);

        expect(pushSpy).toHaveBeenCalledTimes(1);
        expect(pullSpy).toHaveBeenCalledTimes(1);
        expect(refreshSpies.coordinates).toHaveBeenCalledTimes(1);
        expect(refreshSpies.dolls).toHaveBeenCalledTimes(1);
        expect(refreshSpies.garments).toHaveBeenCalledTimes(1);
        expect(refreshSpies.storageCases).toHaveBeenCalledTimes(1);
        expect(refreshSpies.storageLocations).toHaveBeenCalledTimes(1);
        expect(store.get(syncStatusAtom)).toBe(SYNC_STATUS.IDLE);
        expect(store.get(lastSyncErrorAtom)).toBeUndefined();
        const remaining = await getDb().syncQueue.count();
        expect(remaining).toBe(0);
      },
    );

    it("無効な type の queue 項目は push リクエストから除外される", async () => {
      installSync({});

      await getDb().syncQueue.bulkAdd([
        {
          type: "unknown:action",
          payload: { foo: "bar" },
          createdAt: FIXED_NOW,
        },
      ]);

      const store = createStore();
      const { executeSyncAtom } = await importSyncAtoms();
      await store.set(executeSyncAtom);

      expect(pushSpy).not.toHaveBeenCalled();
      // 無効 type であってもキュー削除は実行される
      expect(await getDb().syncQueue.count()).toBe(0);
    });

    it("queue が空のときは push を呼ばずに pull に進む", async () => {
      installSync({});

      const store = createStore();
      const { executeSyncAtom, syncStatusAtom } = await importSyncAtoms();
      await store.set(executeSyncAtom);

      expect(pushSpy).not.toHaveBeenCalled();
      expect(pullSpy).toHaveBeenCalledTimes(1);
      expect(store.get(syncStatusAtom)).toBe(SYNC_STATUS.IDLE);
    });

    it("push 失敗時は ERROR 状態と lastSyncError がセットされ、refresh は呼ばれない", async () => {
      installSync({ push: { throwError: new Error("push exploded") } });

      await getDb().syncQueue.bulkAdd([
        {
          type: SYNC_ACTION_TYPE.GARMENT_CREATE,
          payload: { id: "g-1" },
          createdAt: FIXED_NOW,
        },
      ]);

      const store = createStore();
      const { executeSyncAtom, syncStatusAtom, lastSyncErrorAtom } =
        await importSyncAtoms();

      await store.set(executeSyncAtom);

      expect(pullSpy).not.toHaveBeenCalled();
      expect(store.get(syncStatusAtom)).toBe(SYNC_STATUS.ERROR);
      expect(store.get(lastSyncErrorAtom)).toBe("push exploded");
      expect(refreshSpies.dolls).not.toHaveBeenCalled();
      expect(refreshSpies.garments).not.toHaveBeenCalled();
      expect(refreshSpies.storageCases).not.toHaveBeenCalled();
      expect(refreshSpies.storageLocations).not.toHaveBeenCalled();
      expect(refreshSpies.coordinates).not.toHaveBeenCalled();
    });

    it("push が string をスローした場合は server からの message が lastSyncError に入る", async () => {
      installSync({ push: { throwError: "boom" } });

      const store = createStore();
      const { executeSyncAtom, lastSyncErrorAtom, syncStatusAtom } =
        await importSyncAtoms();

      await getDb().syncQueue.bulkAdd([
        {
          type: SYNC_ACTION_TYPE.DOLL_CREATE,
          payload: { id: "d-1" },
          createdAt: FIXED_NOW,
        },
      ]);

      await store.set(executeSyncAtom);

      expect(store.get(syncStatusAtom)).toBe(SYNC_STATUS.ERROR);
      expect(store.get(lastSyncErrorAtom)).toBe("boom");
    });

    it("pull 失敗時も ERROR 状態と lastSyncError がセットされる", async () => {
      installSync({ pull: { throwError: new Error("pull broken") } });

      const store = createStore();
      const { executeSyncAtom, syncStatusAtom, lastSyncErrorAtom } =
        await importSyncAtoms();

      await store.set(executeSyncAtom);

      expect(store.get(syncStatusAtom)).toBe(SYNC_STATUS.ERROR);
      expect(store.get(lastSyncErrorAtom)).toBe("pull broken");
      expect(refreshSpies.dolls).not.toHaveBeenCalled();
    });

    it("pull で得たエンティティが Dexie に書き戻される", async () => {
      installSync({
        pull: {
          resolve: {
            garments: [createTestGarment({ id: "g-pull" })],
            dolls: [createTestDoll({ id: "d-pull" })],
            coordinates: [
              {
                id: "c-pull",
                userId: "user-1",
                name: "コーデ",
                garmentIds: ["g-pull"],
                isAiGenerated: false,
                memo: undefined,
                createdAt: FIXED_NOW,
                updatedAt: FIXED_NOW,
              },
            ],
            storageCases: [
              { ...createTestStorageCase({ id: "case-pull" }), type: "unit" },
              { ...createTestStorageCase({ id: "case-grid" }), type: "grid" },
            ],
            storageLocations: [
              createTestStorageLocation({
                id: "loc-pull",
                caseId: "case-pull",
              }),
            ],
          },
        },
      });

      // 同期前にローカルに残るはずのレコードを入れる（クリアされる確認）
      await getDb().garments.add(createTestGarment({ id: "stale" }));

      const store = createStore();
      const { executeSyncAtom } = await importSyncAtoms();
      await store.set(executeSyncAtom);

      const garments = await getDb().garments.toArray();
      const dolls = await getDb().dolls.toArray();
      const coordinates = await getDb().coordinates.toArray();
      const cases = await getDb().storageCases.toArray();
      const locations = await getDb().storageLocations.toArray();

      expect(garments.map((g) => g.id)).toEqual(["g-pull"]);
      expect(dolls.map((d) => d.id)).toEqual(["d-pull"]);
      expect(coordinates.map((c) => c.id)).toEqual(["c-pull"]);
      expect(cases.map((c) => c.id).sort()).toEqual(["case-grid", "case-pull"]);
      expect(cases.find((c) => c.id === "case-pull")?.type).toBe("unit");
      expect(cases.find((c) => c.id === "case-grid")?.type).toBe("grid");
      expect(locations.map((l) => l.id)).toEqual(["loc-pull"]);
    });

    it("実行開始時に lastSyncError が一旦クリアされる", async () => {
      installSync({});

      const store = createStore();
      const { executeSyncAtom, lastSyncErrorAtom } = await importSyncAtoms();
      store.set(lastSyncErrorAtom, "前回のエラー");
      expect(store.get(lastSyncErrorAtom)).toBe("前回のエラー");

      await store.set(executeSyncAtom);

      expect(store.get(lastSyncErrorAtom)).toBeUndefined();
    });
  });

  describe("pendingSyncCountAtom", () => {
    it("syncQueue の件数を返す", async () => {
      await getDb().syncQueue.bulkAdd([
        {
          type: SYNC_ACTION_TYPE.GARMENT_CREATE,
          payload: { id: "g-1" },
          createdAt: FIXED_NOW,
        },
        {
          type: SYNC_ACTION_TYPE.DOLL_CREATE,
          payload: { id: "d-1" },
          createdAt: FIXED_NOW + 1,
        },
      ]);

      const store = createStore();
      const { pendingSyncCountAtom } = await importSyncAtoms();
      const count = await store.get(pendingSyncCountAtom);
      expect(count).toBe(2);
    });

    it("refreshPendingSyncCountAtom の発火後に再カウントされる", async () => {
      const store = createStore();
      const { pendingSyncCountAtom, refreshPendingSyncCountAtom } =
        await importSyncAtoms();

      expect(await store.get(pendingSyncCountAtom)).toBe(0);

      await getDb().syncQueue.add({
        type: SYNC_ACTION_TYPE.GARMENT_CREATE,
        payload: { id: "g-1" },
        createdAt: FIXED_NOW,
      });

      store.set(refreshPendingSyncCountAtom);
      expect(await store.get(pendingSyncCountAtom)).toBe(1);
    });

    it("indexedDB が undefined のときは 0 を返す", async () => {
      vi.stubGlobal("indexedDB", undefined);

      const store = createStore();
      const { pendingSyncCountAtom } = await importSyncAtoms();
      const count = await store.get(pendingSyncCountAtom);
      expect(count).toBe(0);
    });
  });
});
