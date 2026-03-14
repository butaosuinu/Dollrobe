import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Garment, StorageLocation } from "@/types";
import { createTestGarment, createTestStorageLocation } from "@/test/factories";
import { renderWithProviders } from "@/test/testUtils";
import ScanPage from "./page";

const scanTrigger = vi.hoisted(
  (): { onScan: ((data: string) => void) | undefined } => ({
    onScan: undefined,
  }),
);

vi.mock("@/components/scan/QrScanner", () => ({
  default: ({
    onScan,
  }: {
    readonly onScan: (data: string) => void;
    readonly isActive: boolean;
  }) => {
    scanTrigger.onScan = onScan;
    return <div data-testid="qr-scanner" />;
  },
}));

const mockGarments = vi.hoisted((): { value: Garment[] } => ({
  value: [],
}));

const mockLocations = vi.hoisted((): { value: StorageLocation[] } => ({
  value: [],
}));

const mockConfirmAll = vi.hoisted(() => vi.fn());

vi.mock("@/stores/garmentAtoms", async () => {
  const { atom } = await import("jotai");
  return {
    garmentsAtom: atom(() => mockGarments.value),
    confirmAllGarmentsAtom: atom(
      undefined,
      (_get: unknown, _set: unknown, locationId: unknown) => {
        mockConfirmAll(locationId);
      },
    ),
  };
});

vi.mock("@/stores/locationAtoms", async () => {
  const { atom } = await import("jotai");
  return {
    storageCasesAtom: atom(() => []),
    storageLocationsAtom: atom(() => mockLocations.value),
  };
});

const simulateScan = (data: string) => {
  act(() => {
    scanTrigger.onScan?.(data);
  });
};

describe("ScanPage", () => {
  beforeEach(() => {
    mockGarments.value = [];
    mockLocations.value = [];
    mockConfirmAll.mockClear();
    scanTrigger.onScan = undefined;
  });

  it("初期状態で場所スキャンのプロンプトを表示する", () => {
    renderWithProviders(<ScanPage />);

    expect(
      screen.getByText("場所のQRをスキャンして、収納場所を設定してください"),
    ).toBeInTheDocument();
  });

  it("場所QRスキャンで場所名と確認ボタンを表示する", () => {
    mockLocations.value = [
      createTestStorageLocation({ id: "loc-1", label: "A-1" }),
    ];
    renderWithProviders(<ScanPage />);

    simulateScan("dwg://l/loc-1");

    expect(
      screen.getByText("この場所の全服を確認済みにする"),
    ).toBeInTheDocument();
    expect(screen.getByText("場所を設定しました")).toBeInTheDocument();
  });

  it("服QRスキャンでスキャン結果を表示する", () => {
    mockLocations.value = [
      createTestStorageLocation({ id: "loc-1", label: "A-1" }),
    ];
    mockGarments.value = [createTestGarment({ id: "g-1", name: "白いドレス" })];
    renderWithProviders(<ScanPage />);

    simulateScan("dwg://l/loc-1");
    simulateScan("dwg://g/g-1");

    expect(screen.getByText("白いドレス")).toBeInTheDocument();
    expect(screen.getByText("1着をスキャンしました")).toBeInTheDocument();
  });

  it("複数の服をスキャンするとカウントが増える", () => {
    mockLocations.value = [
      createTestStorageLocation({ id: "loc-1", label: "A-1" }),
    ];
    mockGarments.value = [
      createTestGarment({ id: "g-1", name: "白いドレス" }),
      createTestGarment({ id: "g-2", name: "黒いコート" }),
    ];
    renderWithProviders(<ScanPage />);

    simulateScan("dwg://l/loc-1");
    simulateScan("dwg://g/g-1");
    simulateScan("dwg://g/g-2");

    expect(screen.getByText("2着をスキャンしました")).toBeInTheDocument();
  });

  it("同じ服を重複スキャンしてもカウントは増えない", () => {
    mockLocations.value = [
      createTestStorageLocation({ id: "loc-1", label: "A-1" }),
    ];
    mockGarments.value = [createTestGarment({ id: "g-1", name: "白いドレス" })];
    renderWithProviders(<ScanPage />);

    simulateScan("dwg://l/loc-1");
    simulateScan("dwg://g/g-1");
    simulateScan("dwg://g/g-1");

    expect(screen.getByText("1着をスキャンしました")).toBeInTheDocument();
  });

  it("全確認ボタンでconfirmAllを呼びセッションをリセットする", async () => {
    mockLocations.value = [
      createTestStorageLocation({ id: "loc-1", label: "A-1" }),
    ];
    renderWithProviders(<ScanPage />);

    simulateScan("dwg://l/loc-1");

    fireEvent.click(screen.getByText("この場所の全服を確認済みにする"));

    await waitFor(() => {
      expect(mockConfirmAll).toHaveBeenCalledWith("loc-1");
      expect(
        screen.getByText("場所のQRをスキャンして、収納場所を設定してください"),
      ).toBeInTheDocument();
    });
  });

  it("リセットボタンで初期状態に戻る", () => {
    mockLocations.value = [
      createTestStorageLocation({ id: "loc-1", label: "A-1" }),
    ];
    renderWithProviders(<ScanPage />);

    simulateScan("dwg://l/loc-1");

    fireEvent.click(screen.getByText("リセット"));

    expect(
      screen.getByText("場所のQRをスキャンして、収納場所を設定してください"),
    ).toBeInTheDocument();
  });
});
