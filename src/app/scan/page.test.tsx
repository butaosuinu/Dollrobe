import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, screen, fireEvent, waitFor } from "@testing-library/react";
import { testDb, FIXED_NOW } from "@/test/mocks/db";
import { seedDbFromTestDb } from "@/test/helpers/seedDb";
import { renderWithProviders } from "@/test/testUtils";
import { MS_PER_DAY } from "@/lib/constants";
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

const simulateScan = (data: string) => {
  act(() => {
    scanTrigger.onScan?.(data);
  });
};

describe("ScanPage", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
    scanTrigger.onScan = undefined;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("初期状態で場所スキャンのプロンプトを表示する", async () => {
    await renderWithProviders(<ScanPage />);

    expect(
      await screen.findByText(
        "場所のQRをスキャンして、収納場所を設定してください",
      ),
    ).toBeInTheDocument();
  });

  it("場所QRスキャンで場所名と確認ボタンを表示する", async () => {
    testDb.storageLocation.create({ id: "loc-1", label: "A-1" });
    await seedDbFromTestDb();

    await renderWithProviders(<ScanPage />);

    simulateScan("dwg://l/loc-1");

    expect(
      screen.getByText("この場所の全服を確認済みにする"),
    ).toBeInTheDocument();
    expect(screen.getByText("場所を設定しました")).toBeInTheDocument();
  });

  it("服QRスキャンでスキャン結果を表示する", async () => {
    testDb.storageLocation.create({ id: "loc-1", label: "A-1" });
    testDb.garment.create({ id: "g-1", name: "白いドレス" });
    await seedDbFromTestDb();

    await renderWithProviders(<ScanPage />);

    simulateScan("dwg://l/loc-1");
    simulateScan("dwg://g/g-1");

    expect(screen.getByText("白いドレス")).toBeInTheDocument();
    expect(screen.getByText("1着をスキャンしました")).toBeInTheDocument();
  });

  it("複数の服をスキャンするとカウントが増える", async () => {
    testDb.storageLocation.create({ id: "loc-1", label: "A-1" });
    testDb.garment.create({ id: "g-1", name: "白いドレス" });
    testDb.garment.create({ id: "g-2", name: "黒いコート" });
    await seedDbFromTestDb();

    await renderWithProviders(<ScanPage />);

    simulateScan("dwg://l/loc-1");
    simulateScan("dwg://g/g-1");
    simulateScan("dwg://g/g-2");

    expect(screen.getByText("2着をスキャンしました")).toBeInTheDocument();
  });

  it("同じ服を重複スキャンしてもカウントは増えない", async () => {
    testDb.storageLocation.create({ id: "loc-1", label: "A-1" });
    testDb.garment.create({ id: "g-1", name: "白いドレス" });
    await seedDbFromTestDb();

    await renderWithProviders(<ScanPage />);

    simulateScan("dwg://l/loc-1");
    simulateScan("dwg://g/g-1");
    simulateScan("dwg://g/g-1");

    expect(screen.getByText("1着をスキャンしました")).toBeInTheDocument();
  });

  it("全確認ボタンでconfirmAllを呼びセッションをリセットする", async () => {
    testDb.storageLocation.create({ id: "loc-1", label: "A-1" });
    testDb.garment.create({
      id: "g-1",
      locationId: "loc-1",
      status: "stored",
    });
    await seedDbFromTestDb();

    await renderWithProviders(<ScanPage />);

    simulateScan("dwg://l/loc-1");

    fireEvent.click(screen.getByText("この場所の全服を確認済みにする"));

    await waitFor(() => {
      expect(
        screen.getByText("場所のQRをスキャンして、収納場所を設定してください"),
      ).toBeInTheDocument();
    });

    const { db } = await import("@/lib/db/dexie");
    await waitFor(async () => {
      const garments = await db.garments
        .where("locationId")
        .equals("loc-1")
        .toArray();
      garments.forEach((g) =>
        expect(g.lastScannedAt).toBeGreaterThanOrEqual(FIXED_NOW),
      );
    });
  });

  it("リセットボタンで初期状態に戻る", async () => {
    testDb.storageLocation.create({ id: "loc-1", label: "A-1" });
    await seedDbFromTestDb();

    await renderWithProviders(<ScanPage />);

    simulateScan("dwg://l/loc-1");

    fireEvent.click(screen.getByText("リセット"));

    expect(
      screen.getByText("場所のQRをスキャンして、収納場所を設定してください"),
    ).toBeInTheDocument();
  });

  describe("機会確認ダイアログ", () => {
    it("信頼度低アイテムがある場所QRスキャンでダイアログが表示される", async () => {
      testDb.storageLocation.create({ id: "loc-1", label: "A-1" });
      testDb.garment.create({
        id: "g-1",
        name: "古いドレス",
        locationId: "loc-1",
        status: "stored",
        lastScannedAt: FIXED_NOW - 20 * MS_PER_DAY,
        confidenceDecayDays: 30,
      });
      await seedDbFromTestDb();

      await renderWithProviders(<ScanPage />);

      simulateScan("dwg://l/loc-1");

      expect(screen.getByText("古いドレス")).toBeInTheDocument();
      expect(screen.getByText("全部ある")).toBeInTheDocument();
    });

    it("全アイテム信頼度高の場合ダイアログは表示されない", async () => {
      testDb.storageLocation.create({ id: "loc-1", label: "A-1" });
      testDb.garment.create({
        id: "g-1",
        name: "新しいドレス",
        locationId: "loc-1",
        status: "stored",
        lastScannedAt: FIXED_NOW,
        confidenceDecayDays: 30,
      });
      await seedDbFromTestDb();

      await renderWithProviders(<ScanPage />);

      simulateScan("dwg://l/loc-1");

      expect(screen.queryByText("全部ある")).toBeNull();
    });

    it("ダイアログの「全部ある」後もスキャンセッションが継続する", async () => {
      testDb.storageLocation.create({ id: "loc-1", label: "A-1" });
      testDb.garment.create({
        id: "g-1",
        name: "古いドレス",
        locationId: "loc-1",
        status: "stored",
        lastScannedAt: FIXED_NOW - 20 * MS_PER_DAY,
        confidenceDecayDays: 30,
      });
      await seedDbFromTestDb();

      await renderWithProviders(<ScanPage />);

      simulateScan("dwg://l/loc-1");

      act(() => {
        fireEvent.click(screen.getByRole("button", { name: "全部ある" }));
      });

      await waitFor(() => {
        expect(screen.queryByText("全部ある")).toBeNull();
      });
      expect(
        screen.getByText("この場所の全服を確認済みにする"),
      ).toBeInTheDocument();

      const { db } = await import("@/lib/db/dexie");
      await waitFor(async () => {
        const garments = await db.garments
          .where("locationId")
          .equals("loc-1")
          .toArray();
        garments.forEach((g) =>
          expect(g.lastScannedAt).toBeGreaterThanOrEqual(FIXED_NOW),
        );
      });
    });
  });
});
