import { createId } from "@paralleldrive/cuid2";
import { TEMP_USER_ID } from "../trpc/lib/d1-helpers";
import { createTestCaller, resetDatabase, getTestDb } from "./helpers";

describe("sync で confidenceDecayDaysOverride を伝搬", () => {
  const caller = createTestCaller();

  beforeEach(async () => {
    await resetDatabase(getTestDb());
  });

  it("garment:create で override を保存し、garment:update で null クリアできる", async () => {
    const now = Date.now();
    const id = createId();
    const basePayload = {
      id,
      userId: TEMP_USER_ID,
      name: "テスト服",
      category: "dress",
      dollSizes: ["MSD"],
      colors: [],
      tags: [],
      status: "stored",
      lastScannedAt: now,
      confidenceDecayDays: 30,
      createdAt: now,
      updatedAt: now,
    };

    await caller.sync.push({
      items: [
        {
          type: "garment:create",
          payload: { ...basePayload, confidenceDecayDaysOverride: 45 },
          createdAt: now,
        },
      ],
    });
    expect(
      (await caller.sync.pull({})).garments[0]?.confidenceDecayDaysOverride,
    ).toBe(45);

    await caller.sync.push({
      items: [
        {
          type: "garment:update",
          payload: {
            ...basePayload,
            confidenceDecayDaysOverride: null,
            updatedAt: now + 1000,
          },
          createdAt: now + 1000,
        },
      ],
    });
    expect(
      (await caller.sync.pull({})).garments[0]?.confidenceDecayDaysOverride,
    ).toBeUndefined();
  });
});
