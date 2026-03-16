import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import type { Garment, StorageCase, StorageLocation } from "@/types";
import {
  createTestGarment,
  createTestStorageCase,
  createTestStorageLocation,
  FIXED_NOW,
} from "@/test/factories";
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

const mockCases = vi.hoisted((): { value: StorageCase[] } => ({
  value: [],
}));

const mockLocations = vi.hoisted((): { value: StorageLocation[] } => ({
  value: [],
}));

const mockGarments = vi.hoisted((): { value: Garment[] } => ({
  value: [],
}));

vi.mock("@/stores/locationAtoms", async () => {
  const { atom } = await import("jotai");
  return {
    storageCasesAtom: atom(() => mockCases.value),
    storageLocationsAtom: atom(() => mockLocations.value),
  };
});

vi.mock("@/stores/garmentAtoms", async () => {
  const { atom } = await import("jotai");
  return {
    garmentsAtom: atom(() => mockGarments.value),
  };
});

describe("CaseDetailPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
    mockCases.value = [];
    mockLocations.value = [];
    mockGarments.value = [];
    mockRouterBack.mockClear();
    mockRouterPush.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("ケースが見つからない場合にフォールバックを表示する", () => {
    renderWithProviders(<CaseDetailPage />);

    expect(screen.getByText("ケースが見つかりません")).toBeInTheDocument();
  });

  it("ケースのグリッドセルを正しく描画する", () => {
    mockCases.value = [
      createTestStorageCase({ id: "case-1", rows: 2, cols: 2 }),
    ];
    mockLocations.value = [
      createTestStorageLocation({
        id: "loc-1",
        caseId: "case-1",
        label: "A-1",
        row: 0,
        col: 0,
      }),
      createTestStorageLocation({
        id: "loc-2",
        caseId: "case-1",
        label: "A-2",
        row: 0,
        col: 1,
      }),
      createTestStorageLocation({
        id: "loc-3",
        caseId: "case-1",
        label: "B-1",
        row: 1,
        col: 0,
      }),
      createTestStorageLocation({
        id: "loc-4",
        caseId: "case-1",
        label: "B-2",
        row: 1,
        col: 1,
      }),
    ];
    renderWithProviders(<CaseDetailPage />);

    expect(screen.getByText("A-1")).toBeInTheDocument();
    expect(screen.getByText("A-2")).toBeInTheDocument();
    expect(screen.getByText("B-1")).toBeInTheDocument();
    expect(screen.getByText("B-2")).toBeInTheDocument();
  });

  it("行列数とアイテム数サマリーを表示する", () => {
    mockCases.value = [
      createTestStorageCase({ id: "case-1", rows: 2, cols: 3 }),
    ];
    mockLocations.value = [
      createTestStorageLocation({
        id: "loc-1",
        caseId: "case-1",
        label: "A-1",
      }),
    ];
    mockGarments.value = [
      createTestGarment({ id: "g-1", locationId: "loc-1" }),
    ];
    renderWithProviders(<CaseDetailPage />);

    expect(screen.getByText("2行 x 3列")).toBeInTheDocument();
    expect(screen.getAllByText("1着").length).toBeGreaterThanOrEqual(1);
  });

  it("セルクリックでBottomSheetを開く", () => {
    mockCases.value = [
      createTestStorageCase({ id: "case-1", name: "衣装ケース A" }),
    ];
    mockLocations.value = [
      createTestStorageLocation({
        id: "loc-1",
        caseId: "case-1",
        label: "A-1",
      }),
    ];
    mockGarments.value = [
      createTestGarment({
        id: "g-1",
        name: "白いドレス",
        locationId: "loc-1",
      }),
    ];
    renderWithProviders(<CaseDetailPage />);

    fireEvent.click(screen.getByText("A-1"));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("白いドレス")).toBeInTheDocument();
  });
});
