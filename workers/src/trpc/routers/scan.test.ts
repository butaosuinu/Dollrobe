import { describe, it, expect, beforeEach } from "vitest";
import { createTestCaller, resetDatabase, getTestDb } from "../../test/helpers";
import {
  insertGarment,
  insertStorageCase,
  insertStorageLocation,
} from "../../../test/helpers/factories";

const db = getTestDb();
const caller = createTestCaller();

beforeEach(async () => {
  await resetDatabase(db);
});

describe("scanRouter", () => {
  describe("checkin", () => {
    it("1 件の garment をチェックインする", async () => {
      const { id: caseId } = await insertStorageCase({ db });
      const { id: locId } = await insertStorageLocation({
        db,
        overrides: { caseId },
      });
      const { id: garmentId } = await insertGarment({
        db,
        overrides: { status: "checked_out" },
      });

      const result = await caller.scan.checkin({
        locationId: locId,
        garmentIds: [garmentId],
      });

      expect(result.success).toBe(true);
      expect(result.checkedInCount).toBe(1);

      const garment = await caller.garment.get({ id: garmentId });
      expect(garment.status).toBe("stored");
      expect(garment.locationId).toBe(locId);
      expect(garment.checkedOutAt).toBeUndefined();
    });

    it("複数の garment を一括チェックインする", async () => {
      const { id: caseId } = await insertStorageCase({ db });
      const { id: locId } = await insertStorageLocation({
        db,
        overrides: { caseId },
      });
      const { id: g1 } = await insertGarment({
        db,
        overrides: { status: "checked_out", name: "服1" },
      });
      const { id: g2 } = await insertGarment({
        db,
        overrides: { status: "checked_out", name: "服2" },
      });

      const result = await caller.scan.checkin({
        locationId: locId,
        garmentIds: [g1, g2],
      });

      expect(result.checkedInCount).toBe(2);

      const garment1 = await caller.garment.get({ id: g1 });
      const garment2 = await caller.garment.get({ id: g2 });
      expect(garment1.status).toBe("stored");
      expect(garment2.status).toBe("stored");
    });

    it("存在しない garmentId を含む場合 NOT_FOUND エラー", async () => {
      const { id: caseId } = await insertStorageCase({ db });
      const { id: locId } = await insertStorageLocation({
        db,
        overrides: { caseId },
      });

      await expect(
        caller.scan.checkin({
          locationId: locId,
          garmentIds: ["nonexistent"],
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("lastScannedAt が更新される", async () => {
      const { id: caseId } = await insertStorageCase({ db });
      const { id: locId } = await insertStorageLocation({
        db,
        overrides: { caseId },
      });
      const oldTimestamp = 1000;
      const { id: garmentId } = await insertGarment({
        db,
        overrides: { status: "checked_out", lastScannedAt: oldTimestamp },
      });

      await caller.scan.checkin({
        locationId: locId,
        garmentIds: [garmentId],
      });

      const garment = await caller.garment.get({ id: garmentId });
      expect(garment.lastScannedAt).toBeGreaterThan(oldTimestamp);
    });
  });

  describe("checkout", () => {
    it("garment をチェックアウトする", async () => {
      const { id: caseId } = await insertStorageCase({ db });
      const { id: locId } = await insertStorageLocation({
        db,
        overrides: { caseId },
      });
      const { id: garmentId } = await insertGarment({
        db,
        overrides: { locationId: locId, status: "stored" },
      });

      const result = await caller.scan.checkout({
        garmentId,
      });

      expect(result.success).toBe(true);

      const garment = await caller.garment.get({ id: garmentId });
      expect(garment.status).toBe("checked_out");
      expect(garment.locationId).toBeUndefined();
      expect(garment.checkedOutAt).toBeDefined();
    });

    it("存在しない garmentId で NOT_FOUND エラー", async () => {
      await expect(
        caller.scan.checkout({ garmentId: "nonexistent" }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("confirmAll", () => {
    it("指定 locationId の全 stored garment の lastScannedAt が更新される", async () => {
      const { id: caseId } = await insertStorageCase({ db });
      const { id: locId } = await insertStorageLocation({
        db,
        overrides: { caseId },
      });
      const oldTimestamp = 1000;
      await insertGarment({
        db,
        overrides: {
          locationId: locId,
          status: "stored",
          lastScannedAt: oldTimestamp,
        },
      });
      await insertGarment({
        db,
        overrides: {
          locationId: locId,
          status: "stored",
          lastScannedAt: oldTimestamp,
        },
      });

      const result = await caller.scan.confirmAll({
        locationId: locId,
      });

      expect(result.success).toBe(true);
      expect(result.confirmedCount).toBe(2);
    });

    it("stored 以外のステータスの garment は更新されない", async () => {
      const { id: caseId } = await insertStorageCase({ db });
      const { id: locId } = await insertStorageLocation({
        db,
        overrides: { caseId },
      });
      await insertGarment({
        db,
        overrides: { locationId: locId, status: "stored" },
      });
      await insertGarment({
        db,
        overrides: { locationId: locId, status: "checked_out" },
      });

      const result = await caller.scan.confirmAll({
        locationId: locId,
      });

      expect(result.confirmedCount).toBe(1);
    });
  });

  describe("confirmPartial", () => {
    it("confirmed=true の garment は lastScannedAt が更新される", async () => {
      const { id: caseId } = await insertStorageCase({ db });
      const { id: locId } = await insertStorageLocation({
        db,
        overrides: { caseId },
      });
      const oldTimestamp = 1000;
      const { id: garmentId } = await insertGarment({
        db,
        overrides: {
          locationId: locId,
          status: "stored",
          lastScannedAt: oldTimestamp,
        },
      });

      const result = await caller.scan.confirmPartial({
        confirmations: [{ garmentId, confirmed: true }],
      });

      expect(result.confirmedCount).toBe(1);
      expect(result.deniedCount).toBe(0);

      const garment = await caller.garment.get({ id: garmentId });
      expect(garment.lastScannedAt).toBeGreaterThan(oldTimestamp);
    });

    it("confirmed=false の garment は checked_out に遷移する", async () => {
      const { id: caseId } = await insertStorageCase({ db });
      const { id: locId } = await insertStorageLocation({
        db,
        overrides: { caseId },
      });
      const { id: garmentId } = await insertGarment({
        db,
        overrides: { locationId: locId, status: "stored" },
      });

      const result = await caller.scan.confirmPartial({
        confirmations: [{ garmentId, confirmed: false }],
      });

      expect(result.confirmedCount).toBe(0);
      expect(result.deniedCount).toBe(1);

      const garment = await caller.garment.get({ id: garmentId });
      expect(garment.status).toBe("checked_out");
      expect(garment.checkedOutAt).toBeDefined();
    });

    it("混在する confirmations を正しく処理する", async () => {
      const { id: caseId } = await insertStorageCase({ db });
      const { id: locId } = await insertStorageLocation({
        db,
        overrides: { caseId },
      });
      const { id: g1 } = await insertGarment({
        db,
        overrides: { locationId: locId, status: "stored", name: "確認済み" },
      });
      const { id: g2 } = await insertGarment({
        db,
        overrides: { locationId: locId, status: "stored", name: "否認" },
      });

      const result = await caller.scan.confirmPartial({
        confirmations: [
          { garmentId: g1, confirmed: true },
          { garmentId: g2, confirmed: false },
        ],
      });

      expect(result.confirmedCount).toBe(1);
      expect(result.deniedCount).toBe(1);

      const garment1 = await caller.garment.get({ id: g1 });
      expect(garment1.status).toBe("stored");

      const garment2 = await caller.garment.get({ id: g2 });
      expect(garment2.status).toBe("checked_out");
    });
  });

  describe("orphanResolve", () => {
    it("stored_back: stored に遷移し locationId が設定される", async () => {
      const { id: caseId } = await insertStorageCase({ db });
      const { id: locId } = await insertStorageLocation({
        db,
        overrides: { caseId },
      });
      const { id: garmentId } = await insertGarment({
        db,
        overrides: { status: "checked_out" },
      });

      const result = await caller.scan.orphanResolve({
        garmentId,
        resolution: "stored_back",
        locationId: locId,
      });

      expect(result.success).toBe(true);

      const garment = await caller.garment.get({ id: garmentId });
      expect(garment.status).toBe("stored");
      expect(garment.locationId).toBe(locId);
      expect(garment.checkedOutAt).toBeUndefined();
    });

    it("still_using: checked_out_at がリセットされる", async () => {
      const oldCheckedOutAt = 1000;
      const { id: garmentId } = await insertGarment({
        db,
        overrides: {
          status: "checked_out",
          checkedOutAt: oldCheckedOutAt,
        },
      });

      const result = await caller.scan.orphanResolve({
        garmentId,
        resolution: "still_using",
      });

      expect(result.success).toBe(true);

      const garment = await caller.garment.get({ id: garmentId });
      expect(garment.status).toBe("checked_out");
      expect(garment.checkedOutAt).toBeGreaterThan(oldCheckedOutAt);
    });

    it("lost: lost ステータスに遷移する", async () => {
      const { id: garmentId } = await insertGarment({
        db,
        overrides: { status: "checked_out" },
      });

      const result = await caller.scan.orphanResolve({
        garmentId,
        resolution: "lost",
      });

      expect(result.success).toBe(true);

      const garment = await caller.garment.get({ id: garmentId });
      expect(garment.status).toBe("lost");
      expect(garment.locationId).toBeUndefined();
      expect(garment.checkedOutAt).toBeUndefined();
    });

    it("存在しない garmentId で NOT_FOUND エラー", async () => {
      await expect(
        caller.scan.orphanResolve({
          garmentId: "nonexistent",
          resolution: "lost",
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("checked_out 以外のステータスで BAD_REQUEST エラー", async () => {
      const { id: garmentId } = await insertGarment({
        db,
        overrides: { status: "stored" },
      });

      await expect(
        caller.scan.orphanResolve({
          garmentId,
          resolution: "lost",
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });
  });
});
