import {
  TEST_USER_ID,
  createTestCaller,
  getTestDb,
  resetDatabase,
} from "./helpers";
import {
  insertStorageCase,
  insertStorageLocation,
} from "../../test/helpers/factories";

describe("storageLocation のカウンタ分岐 (hasLocationCounters)", () => {
  const getCaller = () => createTestCaller();

  beforeEach(async () => {
    await resetDatabase(getTestDb());
  });

  const setupLocation = async () => {
    const db = getTestDb();
    const { id: caseId } = await insertStorageCase({ db });
    const { id: locationId } = await insertStorageLocation({
      db,
      overrides: { caseId },
    });
    return { caseId, locationId };
  };

  const updatePayload = (
    locationId: string,
    caseId: string,
    overrides: Record<string, unknown>,
  ) => ({
    id: locationId,
    userId: TEST_USER_ID,
    caseId,
    label: "A-1",
    row: 0,
    col: 0,
    createdAt: Date.now(),
    ...overrides,
  });

  it("confirmAllCount のみ含む payload で counter が書き込まれる", async () => {
    const { caseId, locationId } = await setupLocation();
    const caller = getCaller();

    await caller.sync.push({
      items: [
        {
          type: "storageLocation:update",
          payload: updatePayload(locationId, caseId, { confirmAllCount: 5 }),
          createdAt: Date.now(),
        },
      ],
    });

    const pulled = await caller.sync.pull();
    expect(pulled.storageLocations[0]?.confirmAllCount).toBe(5);
  });

  it("correctionCount のみ含む payload で counter が書き込まれる", async () => {
    const { caseId, locationId } = await setupLocation();
    const caller = getCaller();

    await caller.sync.push({
      items: [
        {
          type: "storageLocation:update",
          payload: updatePayload(locationId, caseId, { correctionCount: 3 }),
          createdAt: Date.now(),
        },
      ],
    });

    const pulled = await caller.sync.pull();
    expect(pulled.storageLocations[0]?.correctionCount).toBe(3);
  });

  it("lastVisitedAt のみ含む payload で counter が書き込まれる", async () => {
    const { caseId, locationId } = await setupLocation();
    const caller = getCaller();
    const visitedAt = Date.now();

    await caller.sync.push({
      items: [
        {
          type: "storageLocation:update",
          payload: updatePayload(locationId, caseId, {
            lastVisitedAt: visitedAt,
          }),
          createdAt: Date.now(),
        },
      ],
    });

    const pulled = await caller.sync.pull();
    expect(pulled.storageLocations[0]?.lastVisitedAt).toBe(visitedAt);
  });
});
