import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Garment, StorageCase, StorageLocation } from "@/types";
import {
  createTestGarment,
  createTestStorageCase,
  createTestStorageLocation,
  FIXED_NOW,
} from "@/test/factories";
import { renderWithProviders } from "@/test/testUtils";
import { MS_PER_DAY } from "@/lib/constants";
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

const mockAddCase = vi.hoisted(() => vi.fn());
const mockUpdateCase = vi.hoisted(() => vi.fn());
const mockDeleteCase = vi.hoisted(() => vi.fn());

vi.mock("@/stores/locationAtoms", async () => {
  const { atom } = await import("jotai");
  return {
    storageCasesAtom: atom(() => mockCases.value),
    storageLocationsAtom: atom(() => mockLocations.value),
    addStorageCaseWithLocationsAtom: atom(undefined, (_get, _set, input) => {
      mockAddCase(input);
    }),
    updateStorageCaseAtom: atom(undefined, (_get, _set, input) => {
      mockUpdateCase(input);
    }),
    deleteStorageCaseAtom: atom(undefined, (_get, _set, input) => {
      mockDeleteCase(input);
    }),
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
    mockAddCase.mockClear();
    mockUpdateCase.mockClear();
    mockDeleteCase.mockClear();
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

    expect(screen.getAllByText("2着").length).toBeGreaterThanOrEqual(1);
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

  it("ケースカードにアイテム数サマリーを表示する", () => {
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
      createTestGarment({ id: "g-3", locationId: "loc-1" }),
    ];
    renderWithProviders(<LocationsPage />);

    expect(screen.getAllByText("3着").length).toBeGreaterThanOrEqual(1);
  });

  it("要確認の服がある場合に要確認バッジを表示する", () => {
    const twentyFiveDaysAgo = FIXED_NOW - MS_PER_DAY * 25;
    mockCases.value = [createTestStorageCase({ id: "case-1" })];
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
        locationId: "loc-1",
        lastScannedAt: FIXED_NOW,
      }),
      createTestGarment({
        id: "g-2",
        locationId: "loc-1",
        lastScannedAt: twentyFiveDaysAgo,
        confidenceDecayDays: 30,
      }),
    ];
    renderWithProviders(<LocationsPage />);

    expect(screen.getByText("1着 要確認")).toBeInTheDocument();
  });
});

describe("LocationsPage CRUD操作", () => {
  beforeEach(() => {
    mockCases.value = [];
    mockLocations.value = [];
    mockGarments.value = [];
    mockAddCase.mockClear();
    mockUpdateCase.mockClear();
    mockDeleteCase.mockClear();
  });

  it("FABボタンクリックでケース作成シートを開く", () => {
    renderWithProviders(<LocationsPage />);

    fireEvent.click(screen.getByLabelText("ケースを追加"));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("ケース名")).toBeInTheDocument();
  });

  it("EmptyStateのアクションボタンでケース作成シートを開く", () => {
    renderWithProviders(<LocationsPage />);

    const buttons = screen.getAllByRole("button", { name: "ケースを追加" });
    const firstButton = buttons[0];
    expect(firstButton).toBeDefined();
    if (firstButton === undefined) return;
    fireEvent.click(firstButton);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("ケース作成フォーム送信でaddCase atomが呼ばれる", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LocationsPage />);

    fireEvent.click(screen.getByLabelText("ケースを追加"));
    await user.type(screen.getByLabelText("ケース名"), "新しいケース");
    fireEvent.click(screen.getByRole("button", { name: "作成" }));

    expect(mockAddCase).toHaveBeenCalledWith(
      expect.objectContaining({ name: "新しいケース" }),
    );
  });

  it("編集ボタンクリックでケース編集シートを開く", () => {
    mockCases.value = [
      createTestStorageCase({ id: "case-1", name: "衣装ケース A" }),
    ];
    mockLocations.value = [
      createTestStorageLocation({ id: "loc-1", caseId: "case-1" }),
    ];
    renderWithProviders(<LocationsPage />);

    fireEvent.click(screen.getByLabelText("編集"));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByDisplayValue("衣装ケース A")).toBeInTheDocument();
  });

  it("ケース編集フォーム送信でupdateCase atomが呼ばれる", async () => {
    const user = userEvent.setup();
    mockCases.value = [
      createTestStorageCase({ id: "case-1", name: "衣装ケース A" }),
    ];
    mockLocations.value = [
      createTestStorageLocation({ id: "loc-1", caseId: "case-1" }),
    ];
    renderWithProviders(<LocationsPage />);

    fireEvent.click(screen.getByLabelText("編集"));
    const input = screen.getByDisplayValue("衣装ケース A");
    await user.clear(input);
    await user.type(input, "衣装ケース B");
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    expect(mockUpdateCase).toHaveBeenCalledWith(
      expect.objectContaining({ name: "衣装ケース B" }),
    );
  });

  it("削除ボタンクリックで確認シートを開く", () => {
    mockCases.value = [
      createTestStorageCase({ id: "case-1", name: "衣装ケース A" }),
    ];
    mockLocations.value = [
      createTestStorageLocation({ id: "loc-1", caseId: "case-1" }),
    ];
    renderWithProviders(<LocationsPage />);

    fireEvent.click(screen.getByLabelText("削除"));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByText(/「衣装ケース A」を削除しますか/u),
    ).toBeInTheDocument();
  });

  it("削除確認でdeleteCase atomが呼ばれる", () => {
    mockCases.value = [
      createTestStorageCase({ id: "case-1", name: "衣装ケース A" }),
    ];
    mockLocations.value = [
      createTestStorageLocation({ id: "loc-1", caseId: "case-1" }),
    ];
    renderWithProviders(<LocationsPage />);

    fireEvent.click(screen.getByLabelText("削除"));
    const deleteButtons = screen.getAllByRole("button", { name: "削除" });
    const lastDeleteButton = deleteButtons[deleteButtons.length - 1];
    expect(lastDeleteButton).toBeDefined();
    if (lastDeleteButton === undefined) return;
    fireEvent.click(lastDeleteButton);

    expect(mockDeleteCase).toHaveBeenCalledWith("case-1");
  });
});
