import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStore } from "jotai";
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
import {
  executeSyncAtom,
  lastSyncErrorAtom,
  pendingSyncCountAtom,
  refreshPendingSyncCountAtom,
  syncStatusAtom,
} from "@/stores/syncAtoms";

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
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("executeSyncAtom", () => {
    it(
      "push と pull が成功すると syncQueue が消化され、Dexie が pull payload で置換され IDLE に戻る",
      { timeout: 15_000 },
      async () => {
        installSync({
          pull: {
            resolve: {
              garments: [createTestGarment({ id: "g-pull" })],
              dolls: [],
              coordinates: [],
              storageCases: [],
              storageLocations: [],
            },
          },
        });

        await getDb().syncQueue.bulkAdd([
          {
            type: SYNC_ACTION_TYPE.GARMENT_CREATE,
            payload: { id: "g-1" },
            createdAt: FIXED_NOW,
          },
        ]);

        const store = createStore();
        await store.set(executeSyncAtom);

        expect(pushSpy).toHaveBeenCalledTimes(1);
        expect(pullSpy).toHaveBeenCalledTimes(1);
        expect(store.get(syncStatusAtom)).toBe(SYNC_STATUS.IDLE);
        expect(store.get(lastSyncErrorAtom)).toBeUndefined();
        expect(await getDb().syncQueue.count()).toBe(0);
        const garments = await getDb().garments.toArray();
        expect(garments.map((g) => g.id)).toEqual(["g-pull"]);
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
      await store.set(executeSyncAtom);

      expect(pushSpy).not.toHaveBeenCalled();
      // 無効 type であってもキュー削除は実行される
      expect(await getDb().syncQueue.count()).toBe(0);
    });

    it("queue が空のときは push を呼ばずに pull に進む", async () => {
      installSync({});

      const store = createStore();
      await store.set(executeSyncAtom);

      expect(pushSpy).not.toHaveBeenCalled();
      expect(pullSpy).toHaveBeenCalledTimes(1);
      expect(store.get(syncStatusAtom)).toBe(SYNC_STATUS.IDLE);
    });

    it("push 失敗時は ERROR 状態と lastSyncError がセットされ、Dexie が pull で clear されない", async () => {
      installSync({ push: { throwError: new Error("push exploded") } });

      await getDb().syncQueue.bulkAdd([
        {
          type: SYNC_ACTION_TYPE.GARMENT_CREATE,
          payload: { id: "g-1" },
          createdAt: FIXED_NOW,
        },
      ]);
      // pull が走らないため、ローカルの stale エントリは残るはず
      await getDb().garments.add(createTestGarment({ id: "stale" }));

      const store = createStore();
      await store.set(executeSyncAtom);

      expect(pullSpy).not.toHaveBeenCalled();
      expect(store.get(syncStatusAtom)).toBe(SYNC_STATUS.ERROR);
      expect(store.get(lastSyncErrorAtom)).toBe("push exploded");
      // pull の transaction.clear() が走っていないので stale が残る
      const garments = await getDb().garments.toArray();
      expect(garments.map((g) => g.id)).toEqual(["stale"]);
      // syncQueue も削除されない（push 失敗で bulkDelete 前に return）
      expect(await getDb().syncQueue.count()).toBe(1);
    });

    it("push が string をスローした場合は server からの message が lastSyncError に入る", async () => {
      installSync({ push: { throwError: "boom" } });

      const store = createStore();
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

    it("pull 失敗時も ERROR 状態と lastSyncError がセットされ、Dexie は事前 seed のまま", async () => {
      installSync({ pull: { throwError: new Error("pull broken") } });

      // push が成功したあと pull が失敗するパス。push 成功で syncQueue は削除される
      await getDb().syncQueue.bulkAdd([
        {
          type: SYNC_ACTION_TYPE.GARMENT_CREATE,
          payload: { id: "g-1" },
          createdAt: FIXED_NOW,
        },
      ]);
      await getDb().garments.add(createTestGarment({ id: "stale" }));

      const store = createStore();
      await store.set(executeSyncAtom);

      expect(store.get(syncStatusAtom)).toBe(SYNC_STATUS.ERROR);
      expect(store.get(lastSyncErrorAtom)).toBe("pull broken");
      // push 成功 → syncQueue は消化されている
      expect(await getDb().syncQueue.count()).toBe(0);
      // pull 失敗 → garments は事前 seed のまま
      const garments = await getDb().garments.toArray();
      expect(garments.map((g) => g.id)).toEqual(["stale"]);
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
      const count = await store.get(pendingSyncCountAtom);
      expect(count).toBe(2);
    });

    it("refreshPendingSyncCountAtom の発火後に再カウントされる", async () => {
      const store = createStore();
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
      const count = await store.get(pendingSyncCountAtom);
      expect(count).toBe(0);
    });
  });
});
