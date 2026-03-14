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
import LocationsPage from "./page";

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

describe("LocationsPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
    mockCases.value = [];
    mockLocations.value = [];
    mockGarments.value = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("収納場所がない場合に空状態を表示する", () => {
    renderWithProviders(<LocationsPage />);

    expect(screen.getByText("まだ収納場所がありません")).toBeInTheDocument();
  });

  it("ケースの名前と行列数を表示する", () => {
    mockCases.value = [
      createTestStorageCase({
        id: "case-1",
        name: "衣装ケース A",
        rows: 3,
        cols: 3,
      }),
    ];
    mockLocations.value = [
      createTestStorageLocation({
        id: "loc-1",
        caseId: "case-1",
        label: "A-1",
      }),
    ];
    renderWithProviders(<LocationsPage />);

    expect(screen.getByText("衣装ケース A")).toBeInTheDocument();
    expect(screen.getByText("3行 x 3列")).toBeInTheDocument();
  });

  it("グリッドセルのラベルを表示する", () => {
    mockCases.value = [createTestStorageCase({ id: "case-1" })];
    mockLocations.value = [
      createTestStorageLocation({
        id: "loc-1",
        caseId: "case-1",
        label: "A-1",
      }),
      createTestStorageLocation({
        id: "loc-2",
        caseId: "case-1",
        label: "A-2",
        col: 1,
      }),
    ];
    renderWithProviders(<LocationsPage />);

    expect(screen.getByText("A-1")).toBeInTheDocument();
    expect(screen.getByText("A-2")).toBeInTheDocument();
  });

  it("セルに服数を表示する", () => {
    mockCases.value = [createTestStorageCase({ id: "case-1" })];
    mockLocations.value = [
      createTestStorageLocation({
        id: "loc-1",
        caseId: "case-1",
        label: "A-1",
      }),
    ];
    mockGarments.value = [
      createTestGarment({ id: "g-1", locationId: "loc-1" }),
      createTestGarment({ id: "g-2", locationId: "loc-1" }),
    ];
    renderWithProviders(<LocationsPage />);

    expect(screen.getByText("2着")).toBeInTheDocument();
  });

  it("セルクリックでBottomSheetを開き服一覧を表示する", () => {
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
    renderWithProviders(<LocationsPage />);

    fireEvent.click(screen.getByText("A-1"));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("白いドレス")).toBeInTheDocument();
  });

  it("空のセルクリックで服がないメッセージを表示する", () => {
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
    mockGarments.value = [];
    renderWithProviders(<LocationsPage />);

    fireEvent.click(screen.getByText("A-1"));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("この場所には服がありません")).toBeInTheDocument();
  });

  it("BottomSheetの閉じるボタンでシートを閉じる", () => {
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
    renderWithProviders(<LocationsPage />);

    fireEvent.click(screen.getByText("A-1"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("閉じる"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
