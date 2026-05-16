import { describe, it, expect, beforeEach } from "vitest";
import { createDrizzle } from "../db/client";
import { getTestDb, resetDatabase } from "../test/helpers";
import {
  batchCheckin,
  batchConfirmPartial,
} from "../repositories/scan-repository";

beforeEach(async () => {
  await resetDatabase(getTestDb());
});

describe("scan-repository edge cases", () => {
  it("batchCheckin: 空配列で 0 を返す (early return)", async () => {
    const drizzleDb = createDrizzle(getTestDb());
    const result = await batchCheckin({
      drizzleDb,
      userId: "u",
      locationId: "loc-x",
      garmentIds: [],
    });
    expect(result).toBe(0);
  });

  it("batchConfirmPartial: 空配列で何も起きない (early return)", async () => {
    const drizzleDb = createDrizzle(getTestDb());
    await expect(
      batchConfirmPartial({
        drizzleDb,
        userId: "u",
        confirmations: [],
      }),
    ).resolves.toBeUndefined();
  });
});
