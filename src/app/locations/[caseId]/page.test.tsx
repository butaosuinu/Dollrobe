import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { testDb, FIXED_NOW } from "@/test/mocks/db";
import { seedDbFromTestDb } from "@/test/helpers/seedDb";
import { renderWithProviders } from "@/test/testUtils";
import { getDb } from "@/lib/db/dexie";
import { MS_PER_DAY } from "@/lib/constants";
import { getConfidence, getConfidenceLabel } from "@/lib/confidence";
import CaseDetailPage from "./page";

const mockRouterBack = vi.fn();
const mockRouterPush = vi.fn();
const searchParamsRef = vi.hoisted(() => ({
  current: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ caseId: "case-1" }),
  useRouter: () => ({ back: mockRouterBack, push: mockRouterPush }),
  useSearchParams: () => searchParamsRef.current,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    readonly href: string;
    readonly children: React.ReactNode;
  } & Record<string, unknown>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("CaseDetailPage", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
    mockRouterBack.mockClear();
    mockRouterPush.mockClear();
    searchParamsRef.current = new URLSearchParams();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ケースが見つからない場合にフォールバックを表示する", async () => {
    await renderWithProviders(<CaseDetailPage />);

    expect(
      await screen.findByText("ケースが見つかりません"),
    ).toBeInTheDocument();
  });

  it("ケースのグリッドセルを正しく描画する", async () => {
    testDb.storageCase.create({ id: "case-1", rows: 2, cols: 2 });
    testDb.storageLocation.create({
      id: "loc-1",
      caseId: "case-1",
      label: "A-1",
      row: 0,
      col: 0,
    });
    testDb.storageLocation.create({
      id: "loc-2",
      caseId: "case-1",
      label: "A-2",
      row: 0,
      col: 1,
    });
    testDb.storageLocation.create({
      id: "loc-3",
      caseId: "case-1",
      label: "B-1",
      row: 1,
      col: 0,
    });
    testDb.storageLocation.create({
      id: "loc-4",
      caseId: "case-1",
      label: "B-2",
      row: 1,
      col: 1,
    });
    await seedDbFromTestDb();

    await renderWithProviders(<CaseDetailPage />);

    expect(screen.getByText("A-1")).toBeInTheDocument();
    expect(screen.getByText("A-2")).toBeInTheDocument();
    expect(screen.getByText("B-1")).toBeInTheDocument();
    expect(screen.getByText("B-2")).toBeInTheDocument();
  });

  it("行列数とアイテム数サマリーを表示する", async () => {
    testDb.storageCase.create({ id: "case-1", rows: 2, cols: 3 });
    testDb.storageLocation.create({
      id: "loc-1",
      caseId: "case-1",
      label: "A-1",
    });
    testDb.garment.create({ id: "g-1", locationId: "loc-1" });
    await seedDbFromTestDb();

    await renderWithProviders(<CaseDetailPage />);

    expect(screen.getByText("2行 x 3列")).toBeInTheDocument();
    expect(screen.getAllByText("1着").length).toBeGreaterThanOrEqual(1);
  });

  it("セルクリックでBottomSheetを開く", async () => {
    testDb.storageCase.create({ id: "case-1", name: "衣装ケース A" });
    testDb.storageLocation.create({
      id: "loc-1",
      caseId: "case-1",
      label: "A-1",
    });
    testDb.garment.create({
      id: "g-1",
      name: "白いドレス",
      locationId: "loc-1",
    });
    await seedDbFromTestDb();

    await renderWithProviders(<CaseDetailPage />);

    fireEvent.click(screen.getByText("A-1"));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("白いドレス")).toBeInTheDocument();
  });

  it("location クエリが指定されていると該当 BottomSheet を初期表示する", async () => {
    testDb.storageCase.create({ id: "case-1", name: "衣装ケース A" });
    testDb.storageLocation.create({
      id: "loc-1",
      caseId: "case-1",
      label: "A-1",
    });
    testDb.storageLocation.create({
      id: "loc-target",
      caseId: "case-1",
      label: "B-2",
      lastVisitedAt: FIXED_NOW - 20 * MS_PER_DAY,
    });
    testDb.garment.create({
      id: "g-target",
      name: "赤いスカート",
      locationId: "loc-target",
      lastScannedAt: FIXED_NOW - 20 * MS_PER_DAY,
    });
    await seedDbFromTestDb();
    searchParamsRef.current = new URLSearchParams("location=loc-target");

    await renderWithProviders(<CaseDetailPage />);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("赤いスカート")).toBeInTheDocument();
  });

  it("記憶ベース確認ボタンで lastScannedAt を半回復させ、location は変更しない", async () => {
    const originalLastVisitedAt = FIXED_NOW - 30 * MS_PER_DAY;
    testDb.storageCase.create({ id: "case-1", name: "衣装ケース A" });
    testDb.storageLocation.create({
      id: "loc-target",
      caseId: "case-1",
      label: "A-1",
      lastVisitedAt: originalLastVisitedAt,
      confirmAllCount: 5,
      correctionCount: 2,
    });
    testDb.garment.create({
      id: "g-1",
      name: "白いドレス",
      locationId: "loc-target",
      status: "stored",
      lastScannedAt: FIXED_NOW - 30 * MS_PER_DAY,
      confidenceDecayDaysOverride: 30,
    });
    await seedDbFromTestDb();
    searchParamsRef.current = new URLSearchParams("location=loc-target");

    await renderWithProviders(<CaseDetailPage />);

    const button = await screen.findByRole("button", {
      name: "今ここにいなくても確認",
    });
    fireEvent.click(button);

    const expectedLastScannedAt = FIXED_NOW - 15 * MS_PER_DAY;
    await waitFor(async () => {
      const garment = await getDb().garments.get("g-1");
      expect(garment?.lastScannedAt).toBe(expectedLastScannedAt);
    });

    // 実効信頼度は 0.5 付近に収まり、confirmed ラベルにはならないこと。
    const updatedGarment = await getDb().garments.get("g-1");
    const location = await getDb().storageLocations.get("loc-target");
    expect(updatedGarment).toBeDefined();
    if (updatedGarment === undefined) return;
    const confidence = getConfidence({
      ...updatedGarment,
      lastLocationVisitedAt: location?.lastVisitedAt,
    });
    expect(confidence).toBeCloseTo(0.5, 5);
    expect(getConfidenceLabel(confidence)).toBe("uncertain");

    // location 側は一切変更しない（visit boost が乗らないようにするため）。
    expect(location?.lastVisitedAt).toBe(originalLastVisitedAt);
    expect(location?.confirmAllCount).toBe(5);
    expect(location?.correctionCount).toBe(2);
  });
});
