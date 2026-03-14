import {
  createTestCaller,
  resetDatabase,
  createTestGarmentInput,
  createTestCaseInput,
  getTestDb,
} from "./helpers";

describe("ルーター横断シナリオ", () => {
  const getCaller = () => createTestCaller(getTestDb());

  beforeEach(async () => {
    await resetDatabase(getTestDb());
  });

  it("服のライフサイクル全体: 作成 → チェックイン → confirmAll → チェックアウト → orphanResolve(stored_back)", async () => {
    const caller = getCaller();

    const caseResult = await caller.location.createCase(
      createTestCaseInput({ name: "メインケース" }),
    );
    const caseDetail = await caller.location.getCase(caseResult.id);
    const locationId = caseDetail.locations[0]!.id;

    const garment = await caller.garment.create(
      createTestGarmentInput({ name: "ライフサイクルテスト服" }),
    );
    expect(garment.status).toBe("checked_out");

    await caller.scan.checkin({
      locationId,
      garmentIds: [garment.id],
    });
    const afterCheckin = await caller.garment.get({ id: garment.id });
    expect(afterCheckin.status).toBe("stored");
    expect(afterCheckin.locationId).toBe(locationId);

    await new Promise((resolve) => setTimeout(resolve, 10));

    const confirmResult = await caller.scan.confirmAll({ locationId });
    expect(confirmResult.confirmedCount).toBe(1);

    const afterConfirm = await caller.garment.get({ id: garment.id });
    expect(afterConfirm.lastScannedAt).toBeGreaterThan(
      afterCheckin.lastScannedAt,
    );

    await caller.scan.checkout({ garmentId: garment.id });
    const afterCheckout = await caller.garment.get({ id: garment.id });
    expect(afterCheckout.status).toBe("checked_out");
    expect(afterCheckout.locationId).toBeUndefined();
    expect(afterCheckout.checkedOutAt).toBeDefined();

    await caller.scan.orphanResolve({
      garmentId: garment.id,
      resolution: "stored_back",
      locationId,
    });
    const finalState = await caller.garment.get({ id: garment.id });
    expect(finalState.status).toBe("stored");
    expect(finalState.locationId).toBe(locationId);
    expect(finalState.checkedOutAt).toBeUndefined();
  });

  it("ケース削除 → 全服 checked_out → 新ケース作成 → 全服を再チェックイン", async () => {
    const caller = getCaller();

    const oldCase = await caller.location.createCase(
      createTestCaseInput({ name: "旧ケース" }),
    );
    const oldDetail = await caller.location.getCase(oldCase.id);
    const oldLocationId = oldDetail.locations[0]!.id;

    const garment1 = await caller.garment.create(
      createTestGarmentInput({ name: "服1", locationId: oldLocationId }),
    );
    const garment2 = await caller.garment.create(
      createTestGarmentInput({ name: "服2", locationId: oldLocationId }),
    );
    expect(garment1.status).toBe("stored");
    expect(garment2.status).toBe("stored");

    await caller.location.deleteCase(oldCase.id);

    const afterDelete1 = await caller.garment.get({ id: garment1.id });
    const afterDelete2 = await caller.garment.get({ id: garment2.id });
    expect(afterDelete1.status).toBe("checked_out");
    expect(afterDelete1.locationId).toBeUndefined();
    expect(afterDelete2.status).toBe("checked_out");
    expect(afterDelete2.locationId).toBeUndefined();

    const caseListAfterDelete = await caller.location.listCases();
    expect(caseListAfterDelete.cases).toHaveLength(0);

    const newCase = await caller.location.createCase(
      createTestCaseInput({ name: "新ケース" }),
    );
    const newDetail = await caller.location.getCase(newCase.id);
    const newLocationId = newDetail.locations[0]!.id;

    await caller.scan.checkin({
      locationId: newLocationId,
      garmentIds: [garment1.id, garment2.id],
    });

    const final1 = await caller.garment.get({ id: garment1.id });
    const final2 = await caller.garment.get({ id: garment2.id });
    expect(final1.status).toBe("stored");
    expect(final1.locationId).toBe(newLocationId);
    expect(final2.status).toBe("stored");
    expect(final2.locationId).toBe(newLocationId);
  });

  it("confirmPartial で一部否定 → orphanResolve で紛失処理", async () => {
    const caller = getCaller();

    const caseResult = await caller.location.createCase(createTestCaseInput());
    const detail = await caller.location.getCase(caseResult.id);
    const locationId = detail.locations[0]!.id;

    const garment1 = await caller.garment.create(
      createTestGarmentInput({ name: "存在する服" }),
    );
    const garment2 = await caller.garment.create(
      createTestGarmentInput({ name: "見つからない服" }),
    );

    await caller.scan.checkin({
      locationId,
      garmentIds: [garment1.id, garment2.id],
    });

    await caller.scan.confirmPartial({
      confirmations: [
        { garmentId: garment1.id, confirmed: true },
        { garmentId: garment2.id, confirmed: false },
      ],
    });

    const afterPartial1 = await caller.garment.get({ id: garment1.id });
    expect(afterPartial1.status).toBe("stored");

    const afterPartial2 = await caller.garment.get({ id: garment2.id });
    expect(afterPartial2.status).toBe("checked_out");

    await caller.scan.orphanResolve({
      garmentId: garment2.id,
      resolution: "lost",
    });

    const finalState = await caller.garment.get({ id: garment2.id });
    expect(finalState.status).toBe("lost");
  });
});
