import { aroundEach, describe, expect, it, vi } from "vitest";
import { createStore } from "jotai";
import { getDb } from "@/lib/db/dexie";
import { setupAuthSession } from "@/test/mocks/modules/authAtomsState";
import { server } from "@/test/mocks/server";
import { unauthenticatedHandler } from "@/test/mocks/handlers";
import {
  createTestGarment,
  createTestStorageLocation,
  createTestStorageCase,
  FIXED_NOW,
} from "@/test/factories";
import { authSessionAtom, authSessionUnwrappedAtom } from "@/stores/authAtoms";
import {
  addStorageCaseWithLocationsAtom,
  deleteStorageCaseAtom,
  updateStorageLocationAtom,
} from "@/stores/locationAtoms";

const primeAuth = async (store: ReturnType<typeof createStore>) => {
  store.sub(authSessionUnwrappedAtom, () => undefined);
  await store.get(authSessionAtom);
  await Promise.resolve();
};

aroundEach(async (runTest) => {
  vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);

  await runTest();

  vi.restoreAllMocks();
});

describe("addStorageCaseWithLocationsAtom", () => {
  it("未認証では何もしない", async () => {
    server.use(unauthenticatedHandler);
    const store = createStore();
    await primeAuth(store);
    await store.set(addStorageCaseWithLocationsAtom, {
      type: "grid",
      name: "case",
      description: undefined,
      rows: 2,
      cols: 2,
      userId: "user-1",
    });
    expect(await getDb().storageCases.count()).toBe(0);
  });

  it("grid 型は rows*cols 個の location を生成する", async () => {
    setupAuthSession({ userId: "user-1" });
    const store = createStore();
    await primeAuth(store);
    await store.set(addStorageCaseWithLocationsAtom, {
      type: "grid",
      name: "ケース",
      description: undefined,
      rows: 2,
      cols: 3,
      userId: "user-1",
    });
    const db = getDb();
    expect(await db.storageCases.count()).toBe(1);
    expect(await db.storageLocations.count()).toBe(6);
  });

  it("unit 型は 1 個の location を生成する", async () => {
    setupAuthSession({ userId: "user-1" });
    const store = createStore();
    await primeAuth(store);
    await store.set(addStorageCaseWithLocationsAtom, {
      type: "unit",
      name: "押し入れ",
      description: undefined,
      userId: "user-1",
    });
    const db = getDb();
    const cases = await db.storageCases.toArray();
    expect(cases[0]?.type).toBe("unit");
    expect(await db.storageLocations.count()).toBe(1);
  });
});

describe("updateStorageLocationAtom", () => {
  it("customName と description が更新される", async () => {
    setupAuthSession({ userId: "user-1" });
    const store = createStore();
    await primeAuth(store);
    const location = createTestStorageLocation({
      id: "loc-1",
      userId: "user-1",
    });
    await getDb().storageLocations.add(location);

    await store.set(updateStorageLocationAtom, {
      location,
      customName: "新名前",
      description: "メモ",
    });

    const updated = await getDb().storageLocations.get("loc-1");
    expect(updated?.customName).toBe("新名前");
    expect(updated?.description).toBe("メモ");
  });
});

describe("deleteStorageCaseAtom", () => {
  it("未認証では何もしない", async () => {
    server.use(unauthenticatedHandler);
    const store = createStore();
    await primeAuth(store);
    await getDb().storageCases.add(
      createTestStorageCase({ id: "case-1", userId: "user-1" }),
    );
    await store.set(deleteStorageCaseAtom, "case-1");
    expect(await getDb().storageCases.count()).toBe(1);
  });

  it("対象ケースが他ユーザーの場合は削除されない", async () => {
    setupAuthSession({ userId: "user-1" });
    const store = createStore();
    await primeAuth(store);
    await getDb().storageCases.add(
      createTestStorageCase({ id: "case-1", userId: "other-user" }),
    );
    await store.set(deleteStorageCaseAtom, "case-1");
    expect(await getDb().storageCases.count()).toBe(1);
  });

  it("ケース内に紐づく garment があれば取り出し中に変える", async () => {
    setupAuthSession({ userId: "user-1" });
    const store = createStore();
    await primeAuth(store);
    const db = getDb();
    await db.storageCases.add(
      createTestStorageCase({ id: "case-1", userId: "user-1" }),
    );
    await db.storageLocations.add(
      createTestStorageLocation({
        id: "loc-1",
        caseId: "case-1",
        userId: "user-1",
      }),
    );
    await db.garments.add(
      createTestGarment({
        id: "g-1",
        userId: "user-1",
        locationId: "loc-1",
        status: "stored",
      }),
    );

    await store.set(deleteStorageCaseAtom, "case-1");

    const garment = await db.garments.get("g-1");
    expect(garment?.status).toBe("checked_out");
    expect(garment?.locationId).toBeUndefined();
    expect(await db.storageCases.count()).toBe(0);
    expect(await db.storageLocations.count()).toBe(0);
  });
});
