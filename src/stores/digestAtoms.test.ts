import { describe, it, expect, vi } from "vitest";
import { createStore } from "jotai";
import { server } from "@/test/mocks/server";
import { trpcMutation, trpcQuery } from "@/test/mocks/trpc/handlerFactory";
import {
  digestListAtom,
  hasUnreadDigestAtom,
  latestDigestAtom,
  markDigestReadAtom,
  refreshDigestAtom,
} from "@/stores/digestAtoms";

const TEST_DIGEST = {
  id: "d-1",
  userId: "u",
  accuracyScore: 0.5,
  confirmedCount: 0,
  uncertainCount: 0,
  unknownCount: 0,
  totalGarments: 0,
  isRead: false,
  generatedAt: 0,
  createdAt: 0,
};

describe("digestAtoms", () => {
  it("digestListAtom が trpc 結果を返す", async () => {
    const store = createStore();
    server.use(trpcQuery("digest.list", () => [TEST_DIGEST]));
    const list = await store.get(digestListAtom);
    expect(list).toEqual([TEST_DIGEST]);
  });

  it("digestListAtom のクエリが失敗した場合は空配列を返す (catch)", async () => {
    const store = createStore();
    server.use(
      trpcQuery(
        "digest.list",
        async () => await Promise.reject(new Error("boom")),
      ),
    );
    const list = await store.get(digestListAtom);
    expect(list).toEqual([]);
  });

  it("latestDigestAtom が trpc 結果を返す", async () => {
    const store = createStore();
    server.use(trpcQuery("digest.latest", () => TEST_DIGEST));
    const latest = await store.get(latestDigestAtom);
    expect(latest).toEqual(TEST_DIGEST);
  });

  it("latestDigestAtom の失敗は undefined にフォールバック", async () => {
    const store = createStore();
    server.use(
      trpcQuery(
        "digest.latest",
        async () => await Promise.reject(new Error("boom")),
      ),
    );
    const latest = await store.get(latestDigestAtom);
    expect(latest).toBeUndefined();
  });

  it("hasUnreadDigestAtom が true を返す", async () => {
    const store = createStore();
    server.use(trpcQuery("digest.hasUnread", () => ({ hasUnread: true })));
    expect(await store.get(hasUnreadDigestAtom)).toBe(true);
  });

  it("hasUnreadDigestAtom の失敗時は false にフォールバック", async () => {
    const store = createStore();
    server.use(
      trpcQuery(
        "digest.hasUnread",
        async () => await Promise.reject(new Error("boom")),
      ),
    );
    expect(await store.get(hasUnreadDigestAtom)).toBe(false);
  });

  it("markDigestReadAtom が trpc mutation を発火する", async () => {
    const store = createStore();
    const handler = vi.fn(async () => await Promise.resolve({ success: true }));
    server.use(trpcMutation("digest.markRead", handler));
    await store.set(markDigestReadAtom, "d-1");
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ input: { id: "d-1" } }),
    );
  });

  it("refreshDigestAtom が trigger を進める (再 query される)", async () => {
    const store = createStore();
    const handler = vi.fn(() => []);
    server.use(trpcQuery("digest.list", handler));
    await store.get(digestListAtom);
    expect(handler).toHaveBeenCalledTimes(1);
    store.set(refreshDigestAtom);
    await store.get(digestListAtom);
    expect(handler).toHaveBeenCalledTimes(2);
  });
});
