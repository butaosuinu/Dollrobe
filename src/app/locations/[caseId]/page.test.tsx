import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { testDb, FIXED_NOW } from "@/test/mocks/db";
import { seedDbFromTestDb } from "@/test/helpers/seedDb";
import { renderWithProviders } from "@/test/testUtils";
import CaseDetailPage from "./page";

const mockRouterBack = vi.fn();
const mockRouterPush = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ caseId: "case-1" }),
  useRouter: () => ({ back: mockRouterBack, push: mockRouterPush }),
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
});
