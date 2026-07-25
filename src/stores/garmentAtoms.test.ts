import { aroundEach, describe, expect, it, vi } from "vitest";
import { createStore } from "jotai";
import { getDb } from "@/lib/db/dexie";
import { setupAuthSession } from "@/test/mocks/modules/authAtomsState";
import { server } from "@/test/mocks/server";
import { unauthenticatedHandler } from "@/test/mocks/handlers";
import {
  createTestGarment,
  createTestStorageLocation,
  FIXED_NOW,
} from "@/test/factories";
import { authSessionAtom, authSessionUnwrappedAtom } from "@/stores/authAtoms";
import {
  confirmAllByMemoryAtom,
  confirmAllGarmentsAtom,
  confirmPartialGarmentsAtom,
} from "@/stores/garmentAtoms";

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

describe("confirmAllGarmentsAtom", () => {
  it("未認証では何もしない", async () => {
    server.use(unauthenticatedHandler);
    const store = createStore();
    await primeAuth(store);
    await store.set(confirmAllGarmentsAtom, "loc-1");
    // 例外を投げずに何も書き込まないことを確認
    const db = getDb();
    expect(await db.garments.count()).toBe(0);
  });

  it("認証済みで対象を lastScannedAt 更新する", async () => {
    setupAuthSession({ userId: "user-1" });
    const store = createStore();
    await primeAuth(store);

    const db = getDb();
    await db.garments.add(
      createTestGarment({
        id: "g-1",
        userId: "user-1",
        locationId: "loc-1",
        status: "stored",
        lastScannedAt: FIXED_NOW - 1_000_000,
      }),
    );
    await db.storageLocations.add(
      createTestStorageLocation({ id: "loc-1", userId: "user-1" }),
    );

    await store.set(confirmAllGarmentsAtom, "loc-1");

    const updated = await db.garments.get("g-1");
    expect(updated?.lastScannedAt).toBe(FIXED_NOW);
    expect(updated?.updatedAt).toBe(FIXED_NOW);
  });

  it("location が他ユーザー所有なら lastVisitedAt は更新されない", async () => {
    setupAuthSession({ userId: "user-1" });
    const store = createStore();
    await primeAuth(store);

    const db = getDb();
    await db.garments.add(
      createTestGarment({
        id: "g-1",
        userId: "user-1",
        locationId: "loc-1",
        status: "stored",
        lastScannedAt: FIXED_NOW - 1_000_000,
      }),
    );
    await db.storageLocations.add(
      createTestStorageLocation({
        id: "loc-1",
        userId: "other-user",
        lastVisitedAt: undefined,
      }),
    );

    await store.set(confirmAllGarmentsAtom, "loc-1");

    const loc = await db.storageLocations.get("loc-1");
    expect(loc?.lastVisitedAt).toBeUndefined();
  });
});

describe("confirmPartialGarmentsAtom", () => {
  it("未認証では何もしない", async () => {
    server.use(unauthenticatedHandler);
    const store = createStore();
    await primeAuth(store);
    await store.set(confirmPartialGarmentsAtom, {
      locationId: "loc-1",
      confirmations: [{ garmentId: "g-1", confirmed: true }],
    });
    expect(await getDb().garments.count()).toBe(0);
  });

  it("denied のみで discrepancy として correctionCount を増やす", async () => {
    setupAuthSession({ userId: "user-1" });
    const store = createStore();
    await primeAuth(store);

    const db = getDb();
    await db.garments.add(
      createTestGarment({
        id: "g-1",
        userId: "user-1",
        locationId: "loc-1",
        status: "stored",
      }),
    );
    await db.storageLocations.add(
      createTestStorageLocation({
        id: "loc-1",
        userId: "user-1",
        confirmAllCount: 0,
        correctionCount: 0,
      }),
    );

    await store.set(confirmPartialGarmentsAtom, {
      locationId: "loc-1",
      confirmations: [{ garmentId: "g-1", confirmed: false }],
    });

    const updated = await db.garments.get("g-1");
    expect(updated?.status).toBe("checked_out");
    expect(updated?.locationId).toBeUndefined();

    const loc = await db.storageLocations.get("loc-1");
    expect(loc?.correctionCount).toBe(1);
    expect(loc?.confirmAllCount).toBe(0);
  });

  it("confirmed のみで discrepancy なしの場合は confirmAllCount を増やす", async () => {
    setupAuthSession({ userId: "user-1" });
    const store = createStore();
    await primeAuth(store);

    const db = getDb();
    await db.garments.add(
      createTestGarment({
        id: "g-1",
        userId: "user-1",
        locationId: "loc-1",
        status: "stored",
      }),
    );
    await db.storageLocations.add(
      createTestStorageLocation({
        id: "loc-1",
        userId: "user-1",
        confirmAllCount: 0,
      }),
    );

    await store.set(confirmPartialGarmentsAtom, {
      locationId: "loc-1",
      confirmations: [{ garmentId: "g-1", confirmed: true }],
    });

    const loc = await db.storageLocations.get("loc-1");
    expect(loc?.confirmAllCount).toBe(1);
  });
});

describe("confirmAllByMemoryAtom", () => {
  it("未認証では何もしない", async () => {
    server.use(unauthenticatedHandler);
    const store = createStore();
    await primeAuth(store);
    await store.set(confirmAllByMemoryAtom, "loc-1");
    expect(await getDb().garments.count()).toBe(0);
  });

  it("認証済みで lastScannedAt を 50% 信頼度相当に巻き戻す", async () => {
    setupAuthSession({ userId: "user-1" });
    const store = createStore();
    await primeAuth(store);

    const db = getDb();
    await db.garments.add(
      createTestGarment({
        id: "g-1",
        userId: "user-1",
        locationId: "loc-1",
        status: "stored",
        confidenceDecayDays: 30,
        recentCheckoutCount: 0,
      }),
    );

    await store.set(confirmAllByMemoryAtom, "loc-1");

    const updated = await db.garments.get("g-1");
    // lastScannedAt は FIXED_NOW - (30 * 0.5 * MS_PER_DAY)
    expect(updated?.lastScannedAt).toBeLessThan(FIXED_NOW);
    expect(updated?.updatedAt).toBe(FIXED_NOW);
  });
});
