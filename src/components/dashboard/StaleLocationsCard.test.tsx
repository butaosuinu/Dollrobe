import { Suspense } from "react";
import { describe, it, expect, vi, aroundEach } from "vitest";
import { screen } from "@testing-library/react";
import { testDb, FIXED_NOW } from "@/test/mocks/db";
import { seedDbFromTestDb } from "@/test/helpers/seedDb";
import { renderWithProviders } from "@/test/testUtils";
import { MS_PER_DAY } from "@/lib/constants";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { setupNextNavigation } from "@/test/mocks/modules/nextNavigation";
import StaleLocationsCard from "./StaleLocationsCard";

const renderCard = async () =>
  await renderWithProviders(
    <ErrorBoundary fallback={<p>エラー</p>}>
      <Suspense fallback={<p>読み込み中</p>}>
        <StaleLocationsCard />
      </Suspense>
    </ErrorBoundary>,
  );

describe("StaleLocationsCard", () => {
  aroundEach(async (runTest) => {
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
    setupNextNavigation();

    await runTest();

    vi.restoreAllMocks();
  });

  it("該当する場所がない場合にカードを表示しない", async () => {
    testDb.storageCase.create({ id: "case-1", name: "衣装ケース A" });
    testDb.storageLocation.create({
      id: "loc-1",
      caseId: "case-1",
      label: "A-1",
      lastVisitedAt: FIXED_NOW - 5 * MS_PER_DAY,
    });
    testDb.garment.create({
      id: "g-1",
      locationId: "loc-1",
      lastScannedAt: FIXED_NOW - 2 * MS_PER_DAY,
    });
    await seedDbFromTestDb();

    await renderCard();

    expect(
      screen.queryByText("しばらく開けていない場所"),
    ).not.toBeInTheDocument();
  });

  it("14日以上未訪問かつ要確認アイテムがある場所を表示する", async () => {
    testDb.storageCase.create({ id: "case-1", name: "衣装ケース A" });
    testDb.storageLocation.create({
      id: "loc-1",
      caseId: "case-1",
      label: "A-1",
      lastVisitedAt: FIXED_NOW - 20 * MS_PER_DAY,
    });
    testDb.garment.create({
      id: "g-1",
      locationId: "loc-1",
      lastScannedAt: FIXED_NOW - 20 * MS_PER_DAY,
      confidenceDecayDaysOverride: 30,
    });
    await seedDbFromTestDb();

    await renderCard();

    expect(
      await screen.findByText("しばらく開けていない場所"),
    ).toBeInTheDocument();
    expect(screen.getByText("衣装ケース A - A-1")).toBeInTheDocument();
    expect(screen.getByText(/20日前に最後に開けました/)).toBeInTheDocument();
    expect(screen.getByText(/未確認 1着/)).toBeInTheDocument();
  });

  it("3件超ある場合に上位3件のみ表示する", async () => {
    testDb.storageCase.create({ id: "case-1", name: "衣装ケース A" });
    const specs = [
      { id: "loc-1", label: "A-1", daysAgo: 15 },
      { id: "loc-2", label: "A-2", daysAgo: 30 },
      { id: "loc-3", label: "A-3", daysAgo: 45 },
      { id: "loc-4", label: "A-4", daysAgo: 60 },
      { id: "loc-5", label: "A-5", daysAgo: 20 },
    ];
    specs.forEach((s) => {
      testDb.storageLocation.create({
        id: s.id,
        caseId: "case-1",
        label: s.label,
        lastVisitedAt: FIXED_NOW - s.daysAgo * MS_PER_DAY,
      });
      testDb.garment.create({
        id: `g-${s.id}`,
        locationId: s.id,
        lastScannedAt: FIXED_NOW - s.daysAgo * MS_PER_DAY,
        confidenceDecayDaysOverride: 30,
      });
    });
    await seedDbFromTestDb();

    await renderCard();

    await screen.findByText("しばらく開けていない場所");
    expect(screen.getByText("衣装ケース A - A-4")).toBeInTheDocument();
    expect(screen.getByText("衣装ケース A - A-3")).toBeInTheDocument();
    expect(screen.getByText("衣装ケース A - A-2")).toBeInTheDocument();
    expect(screen.queryByText("衣装ケース A - A-5")).not.toBeInTheDocument();
    expect(screen.queryByText("衣装ケース A - A-1")).not.toBeInTheDocument();
  });

  it("一度も訪問されていない場所も対象となる", async () => {
    testDb.storageCase.create({ id: "case-1", name: "衣装ケース A" });
    testDb.storageLocation.create({
      id: "loc-1",
      caseId: "case-1",
      label: "A-1",
      lastVisitedAt: null,
      createdAt: FIXED_NOW - 30 * MS_PER_DAY,
    });
    testDb.garment.create({
      id: "g-1",
      locationId: "loc-1",
      lastScannedAt: FIXED_NOW - 30 * MS_PER_DAY,
      confidenceDecayDaysOverride: 30,
    });
    await seedDbFromTestDb();

    await renderCard();

    expect(
      await screen.findByText("しばらく開けていない場所"),
    ).toBeInTheDocument();
    expect(screen.getByText(/まだ開けていません/)).toBeInTheDocument();
  });
});
