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

const nfcSupMod = await vi.hoisted(
  async () => await import("@/test/mocks/modules/useNfcSupported"),
);
const nfcRdrMod = await vi.hoisted(
  async () => await import("@/test/mocks/modules/useNfcReader"),
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

vi.mock("@/hooks/useNfcSupported", nfcSupMod.useNfcSupportedFactory);
vi.mock("@/hooks/useNfcReader", nfcRdrMod.useNfcReaderFactory);

vi.mock("@/components/scan/NfcReader", () => ({
  default: ({
    nfcState,
  }: {
    readonly nfcState: { readonly status: string };
  }) => <div data-testid="nfc-reader" data-status={nfcState.status} />,
}));

vi.mock("@/components/scan/NfcCapabilityBadge", () => ({
  default: () => <span data-testid="nfc-badge" />,
}));

const nfcSupHandle: {
  current: ReturnType<typeof nfcSupMod.setupUseNfcSupported>;
} = {
  current: nfcSupMod.setupUseNfcSupported(),
};

const nfcRdrHandle: {
  current: ReturnType<typeof nfcRdrMod.setupUseNfcReader>;
} = {
  current: nfcRdrMod.setupUseNfcReader({ status: "scanning" }),
};

const simulateScan = (data: string) => {
  act(() => {
    scanTrigger.onScan?.(data);
  });
};

describe("ScanPage (extra)", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
    scanTrigger.onScan = undefined;
    nfcSupHandle.current = nfcSupMod.setupUseNfcSupported(false);
    nfcRdrHandle.current = nfcRdrMod.setupUseNfcReader({ status: "scanning" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("不明な prefix の QR は無視される", async () => {
    testDb.storageLocation.create({ id: "loc-1", label: "A-1" });
    await seedDbFromTestDb();

    await renderWithProviders(<ScanPage />);

    simulateScan("https://example.com/foo");

    expect(
      screen.getByText("場所のQRをスキャンして、収納場所を設定してください"),
    ).toBeInTheDocument();
    expect(screen.queryByText("場所を設定しました")).toBeNull();
    expect(screen.queryByText("スキャンしました")).toBeNull();
  });

  it("未登録の場所IDをスキャンしても locationId 自体をフォールバックして表示する", async () => {
    await renderWithProviders(<ScanPage />);

    simulateScan("dwg://l/unknown-loc");

    expect(screen.getByText("場所を設定しました")).toBeInTheDocument();
    expect(screen.getAllByText("unknown-loc").length).toBeGreaterThan(0);
  });

  it("未登録の服IDをスキャンしても garmentId 自体をフォールバックして表示する", async () => {
    testDb.storageLocation.create({ id: "loc-1", label: "A-1" });
    await seedDbFromTestDb();

    await renderWithProviders(<ScanPage />);

    simulateScan("dwg://l/loc-1");
    simulateScan("dwg://g/unknown-garment");

    expect(screen.getByText("unknown-garment")).toBeInTheDocument();
    expect(screen.getByText("1着をスキャンしました")).toBeInTheDocument();
  });

  it("activeLocation 未設定で全確認を押しても何も起きない", async () => {
    await renderWithProviders(<ScanPage />);

    expect(
      screen.getByText("場所のQRをスキャンして、収納場所を設定してください"),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("button", { name: "この場所の全服を確認済みにする" }),
    ).toBeNull();
  });

  it("信頼度低アイテムなしでは reviewDialog は閉じたまま", async () => {
    testDb.storageLocation.create({ id: "loc-1", label: "A-1" });
    testDb.garment.create({
      id: "g-1",
      name: "新しい服",
      locationId: "loc-1",
      status: "stored",
      lastScannedAt: FIXED_NOW,
      confidenceDecayDays: 30,
      confidenceDecayDaysOverride: 30,
    });
    await seedDbFromTestDb();

    await renderWithProviders(<ScanPage />);

    simulateScan("dwg://l/loc-1");

    expect(screen.queryByText("全部ある")).toBeNull();
    expect(screen.queryByText("ズレを直す")).toBeNull();
  });

  it("ダイアログの「ズレを直す」で個別確認モードに切り替わる", async () => {
    testDb.storageLocation.create({ id: "loc-1", label: "A-1" });
    testDb.garment.create({
      id: "g-1",
      name: "古いドレス",
      locationId: "loc-1",
      status: "stored",
      lastScannedAt: FIXED_NOW - 20 * MS_PER_DAY,
      confidenceDecayDays: 30,
      confidenceDecayDaysOverride: 30,
    });
    await seedDbFromTestDb();

    await renderWithProviders(<ScanPage />);

    simulateScan("dwg://l/loc-1");

    fireEvent.click(screen.getByRole("button", { name: "ズレを直す" }));

    expect(
      screen.getByRole("button", { name: "確定する" }),
    ).toBeInTheDocument();
  });

  it("個別確認モードで「確定する」を押すと confirmPartial が走りダイアログが閉じる", async () => {
    testDb.storageLocation.create({ id: "loc-1", label: "A-1" });
    testDb.garment.create({
      id: "g-1",
      name: "古いドレス",
      locationId: "loc-1",
      status: "stored",
      lastScannedAt: FIXED_NOW - 20 * MS_PER_DAY,
      confidenceDecayDays: 30,
      confidenceDecayDaysOverride: 30,
    });
    await seedDbFromTestDb();

    await renderWithProviders(<ScanPage />);

    simulateScan("dwg://l/loc-1");

    fireEvent.click(screen.getByRole("button", { name: "ズレを直す" }));
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "確定する" }));
    });

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "確定する" })).toBeNull();
    });
  });

  it("信頼度低のアイテムでダイアログ表示中も QrScanner / NfcReader 自体は描画される", async () => {
    nfcSupHandle.current.setSupported(true);
    testDb.storageLocation.create({ id: "loc-1", label: "A-1" });
    testDb.garment.create({
      id: "g-1",
      name: "古いドレス",
      locationId: "loc-1",
      status: "stored",
      lastScannedAt: FIXED_NOW - 20 * MS_PER_DAY,
      confidenceDecayDays: 30,
      confidenceDecayDaysOverride: 30,
    });
    await seedDbFromTestDb();

    await renderWithProviders(<ScanPage />);

    simulateScan("dwg://l/loc-1");

    expect(
      screen.getByRole("button", { name: "全部ある" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("qr-scanner")).toBeInTheDocument();
    expect(screen.getByTestId("nfc-reader")).toBeInTheDocument();
  });
});
