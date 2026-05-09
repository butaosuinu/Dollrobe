import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { testDb, FIXED_NOW } from "@/test/mocks/db";
import { seedDbFromTestDb } from "@/test/helpers/seedDb";
import {
  installCanvas2DContext,
  installVideoReadyState,
} from "@/test/helpers/canvas";
import { flushPromises } from "@/test/helpers/flushPromises";
import {
  createMockMediaStream,
  createMockTrack,
  installMediaDevices,
  installMediaElementPlayback,
} from "@/test/helpers/mediaDevices";
import { setupJsqr, simulateQrScan } from "@/test/mocks/modules/jsqr";
import { setupUseNfcReader } from "@/test/mocks/modules/useNfcReader";
import { setNfcSupported } from "@/test/helpers/nfc";
import { renderWithProviders } from "@/test/testUtils";
import { MS_PER_DAY } from "@/lib/constants";
import ScanPage from "./page";

const nfcRdrHandle: {
  current: ReturnType<typeof setupUseNfcReader>;
} = {
  current: setupUseNfcReader({ status: "scanning" }),
};

describe("ScanPage (extra)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
    setNfcSupported(false);
    nfcRdrHandle.current = setupUseNfcReader({ status: "scanning" });
    setupJsqr();

    installMediaDevices({
      resolveStream: createMockMediaStream(createMockTrack()),
    });
    installCanvas2DContext();
    installVideoReadyState(4, 4);
    installMediaElementPlayback();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("不明な prefix の QR は無視される", async () => {
    testDb.storageLocation.create({ id: "loc-1", label: "A-1" });
    await seedDbFromTestDb();

    await renderWithProviders(<ScanPage />);
    await flushPromises();

    await simulateQrScan("https://example.com/foo");
    await flushPromises();

    expect(
      screen.getByText("場所のQRをスキャンして、収納場所を設定してください"),
    ).toBeInTheDocument();
    expect(screen.queryByText("場所を設定しました")).toBeNull();
    expect(screen.queryByText("スキャンしました")).toBeNull();
  });

  it("未登録の場所IDをスキャンしても locationId 自体をフォールバックして表示する", async () => {
    await renderWithProviders(<ScanPage />);
    await flushPromises();

    await simulateQrScan("dwg://l/unknown-loc");
    await flushPromises();

    expect(screen.getByText("場所を設定しました")).toBeInTheDocument();
    expect(screen.getAllByText("unknown-loc").length).toBeGreaterThan(0);
  });

  it("未登録の服IDをスキャンしても garmentId 自体をフォールバックして表示する", async () => {
    testDb.storageLocation.create({ id: "loc-1", label: "A-1" });
    await seedDbFromTestDb();

    await renderWithProviders(<ScanPage />);
    await flushPromises();

    await simulateQrScan("dwg://l/loc-1");
    await flushPromises();
    await simulateQrScan("dwg://g/unknown-garment");
    await flushPromises();

    expect(screen.getByText("unknown-garment")).toBeInTheDocument();
    expect(screen.getByText("1着をスキャンしました")).toBeInTheDocument();
  });

  it("activeLocation 未設定で全確認を押しても何も起きない", async () => {
    await renderWithProviders(<ScanPage />);
    await flushPromises();

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
    await flushPromises();

    await simulateQrScan("dwg://l/loc-1");
    await flushPromises();

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
    await flushPromises();

    await simulateQrScan("dwg://l/loc-1");
    await flushPromises();

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
    await flushPromises();

    await simulateQrScan("dwg://l/loc-1");
    await flushPromises();

    fireEvent.click(screen.getByRole("button", { name: "ズレを直す" }));
    fireEvent.click(screen.getByRole("button", { name: "確定する" }));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "確定する" })).toBeNull();
    });
  });

  it("信頼度低のアイテムでダイアログ表示中も QrScanner / NfcReader 自体は描画される", async () => {
    setNfcSupported(true);
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
    await flushPromises();

    await simulateQrScan("dwg://l/loc-1");
    await flushPromises();

    expect(
      screen.getByRole("button", { name: "全部ある" }),
    ).toBeInTheDocument();
    expect(document.querySelector("video")).not.toBeNull();
    expect(screen.getByText("NFC 待ち受け中...")).toBeInTheDocument();
  });
});
