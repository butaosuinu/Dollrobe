import { describe, expect, it, vi } from "vitest";
import { trpcClient } from "@/lib/trpc";
import { server } from "@/test/mocks/server";
import { testDb } from "@/test/mocks/db";
import { trpcMutation, trpcQuery } from "./handlerFactory";

describe("trpc handler factory smoke test", () => {
  it("garment.list は testDb の内容を返す", async () => {
    testDb.garment.create({ id: "g-1", name: "服A" });
    testDb.garment.create({ id: "g-2", name: "服B" });

    const result = await trpcClient.garment.list.query({});

    expect(result.map((g) => g.id).sort()).toEqual(["g-1", "g-2"]);
  });

  it("trpcQuery で個別オーバーライドできる", async () => {
    testDb.garment.create({ id: "g-1", name: "default" });

    server.use(
      trpcQuery("garment.list", () => [
        {
          id: "override-1",
          userId: "user-1",
          name: "override",
          category: "dress",
          dollSizes: ["SD"],
          colors: [],
          tags: [],
          imageUrl: undefined,
          locationId: undefined,
          status: "stored",
          lastScannedAt: 0,
          confidenceDecayDays: 30,
          confidenceDecayDaysOverride: undefined,
          recentCheckoutCount: 0,
          brand: undefined,
          description: undefined,
          setContents: undefined,
          checkedOutAt: undefined,
          archivedAt: undefined,
          createdAt: 0,
          updatedAt: 0,
        },
      ]),
    );

    const result = await trpcClient.garment.list.query({});
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("override-1");
  });

  it("trpcMutation で個別オーバーライドできる", async () => {
    const spy = vi.fn();
    server.use(
      trpcMutation("sync.push", ({ input }) => {
        spy(input);
        return { success: true as const, processedCount: 42 };
      }),
    );

    const result = await trpcClient.sync.push.mutate({ items: [] });
    expect(result).toEqual({ success: true, processedCount: 42 });
    expect(spy).toHaveBeenCalledWith({ items: [] });
  });

  it("resolver が同期 throw した場合も TRPCClientError として伝搬する", async () => {
    server.use(
      trpcMutation("sync.push", () => {
        // eslint-disable-next-line functional/no-throw-statements -- 同期 throw 経路の回帰テスト
        throw new Error("sync boom");
      }),
    );

    await expect(trpcClient.sync.push.mutate({ items: [] })).rejects.toThrow(
      "sync boom",
    );
  });
});
