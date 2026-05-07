import { describe, it, expect } from "vitest";
import { createStore } from "jotai";
import { server } from "@/test/mocks/server";
import { unauthenticatedHandler } from "@/test/mocks/handlers";
import { setupAuthSession } from "@/test/mocks/modules/authAtomsState";
import {
  createTestDoll,
  createTestGarment,
  createTestStorageCase,
} from "@/test/factories";
import { getDb } from "@/lib/db/dexie";
import {
  authSessionAtom,
  authSessionUnwrappedAtom,
  currentUserIdAtom,
  signOutAtom,
} from "./authAtoms";

const primeAuth = async (store: ReturnType<typeof createStore>) => {
  store.sub(authSessionUnwrappedAtom, () => undefined);
  await store.get(authSessionAtom);
  await Promise.resolve();
};

describe("authAtoms", () => {
  describe("currentUserIdAtom", () => {
    it("認証済みのときユーザー id を返す", async () => {
      setupAuthSession({ userId: "user-x" });
      const store = createStore();
      await primeAuth(store);

      expect(store.get(currentUserIdAtom)).toBe("user-x");
    });

    it("未認証のとき undefined を返す", async () => {
      server.use(unauthenticatedHandler);
      const store = createStore();
      await primeAuth(store);

      expect(store.get(currentUserIdAtom)).toBeUndefined();
    });
  });

  describe("signOutAtom", () => {
    it("ログアウト時に IndexedDB の全テーブルが clear される", async () => {
      setupAuthSession({ userId: "user-1" });
      const db = getDb();
      await db.garments.add(createTestGarment({ id: "g1", userId: "user-1" }));
      await db.storageCases.add(
        createTestStorageCase({ id: "c1", userId: "user-1" }),
      );
      await db.dolls.add(createTestDoll({ id: "d1", userId: "user-1" }));
      await db.syncQueue.add({
        type: "garment.create",
        payload: {},
        createdAt: 0,
      });

      const store = createStore();
      await primeAuth(store);

      server.use(unauthenticatedHandler);
      await store.set(signOutAtom);

      expect(await db.garments.count()).toBe(0);
      expect(await db.storageCases.count()).toBe(0);
      expect(await db.storageLocations.count()).toBe(0);
      expect(await db.coordinates.count()).toBe(0);
      expect(await db.dolls.count()).toBe(0);
      expect(await db.syncQueue.count()).toBe(0);
    });

    it("ログアウト後 currentUserIdAtom が undefined になる", async () => {
      setupAuthSession({ userId: "user-1" });
      const store = createStore();
      await primeAuth(store);
      expect(store.get(currentUserIdAtom)).toBe("user-1");

      server.use(unauthenticatedHandler);
      await store.set(signOutAtom);
      await Promise.resolve();

      expect(store.get(currentUserIdAtom)).toBeUndefined();
    });
  });
});
