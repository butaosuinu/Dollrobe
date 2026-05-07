import { describe, it, expect, beforeEach } from "vitest";
import { createStore } from "jotai";
import { server } from "@/test/mocks/server";
import { unauthenticatedHandler } from "@/test/mocks/handlers";
import { setupAuthSession } from "@/test/mocks/modules/authAtomsState";
import { createTestGarment } from "@/test/factories";
import { getDb } from "@/lib/db/dexie";
import { SYNC_ACTION_TYPE } from "@/lib/constants";
import { createEntityAtoms } from "./createEntityAtoms";
import { authSessionAtom, authSessionUnwrappedAtom } from "./authAtoms";
import type { Garment } from "@/types";

const garmentEntityAtoms = () =>
  createEntityAtoms<Garment>(() => getDb().garments, {
    create: SYNC_ACTION_TYPE.GARMENT_CREATE,
    update: SYNC_ACTION_TYPE.GARMENT_UPDATE,
    delete: SYNC_ACTION_TYPE.GARMENT_DELETE,
  });

const primeAuth = async (store: ReturnType<typeof createStore>) => {
  store.sub(authSessionUnwrappedAtom, () => undefined);
  await store.get(authSessionAtom);
  await Promise.resolve();
};

describe("createEntityAtoms — userId スコープ化", () => {
  beforeEach(async () => {
    await getDb().garments.bulkAdd([
      createTestGarment({
        id: "g-self-1",
        userId: "user-1",
        name: "自分の服 1",
      }),
      createTestGarment({
        id: "g-self-2",
        userId: "user-1",
        name: "自分の服 2",
      }),
      createTestGarment({
        id: "g-other-1",
        userId: "user-other",
        name: "他人の服",
      }),
    ]);
  });

  it("userId === undefined（未認証）のとき空配列を返す", async () => {
    server.use(unauthenticatedHandler);
    const { dataAtom } = garmentEntityAtoms();
    const store = createStore();
    await primeAuth(store);

    expect(await store.get(dataAtom)).toEqual([]);
  });

  it("認証済みユーザーのデータのみ返す（他人の userId は混入しない）", async () => {
    setupAuthSession({ userId: "user-1" });
    const { dataAtom } = garmentEntityAtoms();
    const store = createStore();
    await primeAuth(store);

    const result = await store.get(dataAtom);

    expect(result.map((g) => g.id).sort()).toEqual(["g-self-1", "g-self-2"]);
  });

  it("addAtom 後 refresh で再 fetch される", async () => {
    setupAuthSession({ userId: "user-1" });
    const { dataAtom, addAtom } = garmentEntityAtoms();
    const store = createStore();
    await primeAuth(store);

    await store.set(
      addAtom,
      createTestGarment({ id: "g-new", userId: "user-1", name: "新規" }),
    );
    const result = await store.get(dataAtom);

    expect(result.map((g) => g.id).sort()).toEqual([
      "g-new",
      "g-self-1",
      "g-self-2",
    ]);
  });
});
