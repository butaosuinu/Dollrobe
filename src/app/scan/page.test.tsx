import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, screen, fireEvent, waitFor } from "@testing-library/react";
import { testDb, FIXED_NOW } from "@/test/mocks/db";
import { seedDbFromTestDb } from "@/test/helpers/seedDb";
import {
  installCanvas2DContext,
  installVideoReadyState,
} from "@/test/helpers/canvas";
import {
  createMockMediaStream,
  createMockTrack,
  installMediaDevices,
} from "@/test/helpers/mediaDevices";
import { setupJsqr, createMockQRCode } from "@/test/mocks/modules/jsqr";
import { setupUseNfcReader } from "@/test/mocks/modules/useNfcReader";
import { setupUseNfcSupported } from "@/test/mocks/modules/useNfcSupported";
import { renderWithProviders } from "@/test/testUtils";
import { MS_PER_DAY } from "@/lib/constants";
import ScanPage from "./page";

const SCAN_INTERVAL_MS = 250;

const nfcSupHandle: {
  current: ReturnType<typeof setupUseNfcSupported>;
} = {
  current: setupUseNfcSupported(),
};

const nfcRdrHandle: {
  current: ReturnType<typeof setupUseNfcReader>;
} = {
  current: setupUseNfcReader({ status: "scanning" }),
};

const jsqrHandle: { current: ReturnType<typeof setupJsqr> } = {
  current: setupJsqr(),
};

const flushPromises = async () => {
  // Dexie 書き込み + jotai async atom + React state 更新を flush。
  // setInterval だけ faked なので microtask は通常通り走る。
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

const simulateScan = async (data: string) => {
  jsqrHandle.current.mockReturnValueOnce(createMockQRCode(data));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(SCAN_INTERVAL_MS);
  });
};

describe("ScanPage", () => {
  beforeEach(() => {
    // setInterval だけ fake にして QrScanner の scanFrame ループを制御。
    // setTimeout / Promise は実物のまま使うことで、Dexie 経由の async atom 解決
    // や findBy* / waitFor が動作する。
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
    nfcSupHandle.current = setupUseNfcSupported(false);
    nfcRdrHandle.current = setupUseNfcReader({ status: "scanning" });
    jsqrHandle.current = setupJsqr();

    installMediaDevices({
      resolveStream: createMockMediaStream(createMockTrack()),
    });
    installCanvas2DContext();
    installVideoReadyState(4, 4);

    Object.defineProperty(HTMLMediaElement.prototype, "play", {
      value: vi.fn(async () => await Promise.resolve(undefined)),
      writable: true,
      configurable: true,
    });
    Object.defineProperty(HTMLMediaElement.prototype, "srcObject", {
      value: undefined,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
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
    await flushPromises();

    await simulateScan("dwg://l/loc-1");
    await flushPromises();

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
    await flushPromises();

    await simulateScan("dwg://l/loc-1");
    await flushPromises();
    await simulateScan("dwg://g/g-1");
    await flushPromises();

    expect(screen.getByText("白いドレス")).toBeInTheDocument();
    expect(screen.getByText("1着をスキャンしました")).toBeInTheDocument();
  });

  it("複数の服をスキャンするとカウントが増える", async () => {
    testDb.storageLocation.create({ id: "loc-1", label: "A-1" });
    testDb.garment.create({ id: "g-1", name: "白いドレス" });
    testDb.garment.create({ id: "g-2", name: "黒いコート" });
    await seedDbFromTestDb();

    await renderWithProviders(<ScanPage />);
    await flushPromises();

    await simulateScan("dwg://l/loc-1");
    await flushPromises();
    await simulateScan("dwg://g/g-1");
    await flushPromises();
    await simulateScan("dwg://g/g-2");
    await flushPromises();

    expect(screen.getByText("2着をスキャンしました")).toBeInTheDocument();
  });

  it("同じ服を重複スキャンしてもカウントは増えない", async () => {
    testDb.storageLocation.create({ id: "loc-1", label: "A-1" });
    testDb.garment.create({ id: "g-1", name: "白いドレス" });
    await seedDbFromTestDb();

    await renderWithProviders(<ScanPage />);
    await flushPromises();

    await simulateScan("dwg://l/loc-1");
    await flushPromises();
    await simulateScan("dwg://g/g-1");
    await flushPromises();
    await simulateScan("dwg://g/g-1");
    await flushPromises();

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
    await flushPromises();

    await simulateScan("dwg://l/loc-1");
    await flushPromises();

    fireEvent.click(screen.getByText("この場所の全服を確認済みにする"));

    await waitFor(() => {
      expect(
        screen.getByText("場所のQRをスキャンして、収納場所を設定してください"),
      ).toBeInTheDocument();
    });

    const { getDb } = await import("@/lib/db/dexie");
    const db = getDb();
    const garments = await db.garments
      .where("locationId")
      .equals("loc-1")
      .toArray();
    garments.forEach((g) =>
      expect(g.lastScannedAt).toBeGreaterThanOrEqual(FIXED_NOW),
    );
  });

  it("リセットボタンで初期状態に戻る", async () => {
    testDb.storageLocation.create({ id: "loc-1", label: "A-1" });
    await seedDbFromTestDb();

    await renderWithProviders(<ScanPage />);
    await flushPromises();

    await simulateScan("dwg://l/loc-1");
    await flushPromises();

    fireEvent.click(screen.getByText("リセット"));
    await flushPromises();

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
      await flushPromises();

      await simulateScan("dwg://l/loc-1");
      await flushPromises();

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
      await flushPromises();

      await simulateScan("dwg://l/loc-1");
      await flushPromises();

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
      await flushPromises();

      await simulateScan("dwg://l/loc-1");
      await flushPromises();

      fireEvent.click(screen.getByRole("button", { name: "全部ある" }));

      await waitFor(() => {
        expect(screen.queryByText("全部ある")).toBeNull();
      });
      expect(
        screen.getByText("この場所の全服を確認済みにする"),
      ).toBeInTheDocument();

      const { getDb } = await import("@/lib/db/dexie");
      const db = getDb();
      const garments = await db.garments
        .where("locationId")
        .equals("loc-1")
        .toArray();
      garments.forEach((g) =>
        expect(g.lastScannedAt).toBeGreaterThanOrEqual(FIXED_NOW),
      );
    });
  });

  describe("NFC 統合", () => {
    it("タイトルが「スキャン」と表示される", async () => {
      await renderWithProviders(<ScanPage />);

      expect(screen.getByText("スキャン")).toBeInTheDocument();
    });

    it("NfcCapabilityBadge が常に表示される", async () => {
      await renderWithProviders(<ScanPage />);

      expect(screen.getByText(/NFC (?:対応|非対応)/)).toBeInTheDocument();
    });

    it("NFC 対応デバイスで NfcReader が表示される", async () => {
      nfcSupHandle.current.setSupported(true);
      await renderWithProviders(<ScanPage />);

      expect(document.querySelector("video")).not.toBeNull();
      expect(screen.getByText("NFC 待ち受け中...")).toBeInTheDocument();
    });

    it("NFC 非対応デバイスで NfcReader が非表示になる", async () => {
      nfcSupHandle.current.setSupported(false);
      await renderWithProviders(<ScanPage />);

      expect(document.querySelector("video")).not.toBeNull();
      expect(screen.queryByText("NFC 待ち受け中...")).toBeNull();
    });

    it("NFC 経由で服スキャンが動作する", async () => {
      nfcSupHandle.current.setSupported(true);
      testDb.storageLocation.create({ id: "loc-1", label: "A-1" });
      testDb.garment.create({ id: "g-1", name: "赤いワンピース" });
      await seedDbFromTestDb();

      await renderWithProviders(<ScanPage />);
      await flushPromises();

      act(() => {
        nfcRdrHandle.current.triggerScan("dwg://l/loc-1");
      });
      await flushPromises();
      act(() => {
        nfcRdrHandle.current.triggerScan("dwg://g/g-1");
      });
      await flushPromises();

      expect(screen.getByText("赤いワンピース")).toBeInTheDocument();
      expect(screen.getByText("1着をスキャンしました")).toBeInTheDocument();
    });

    it("NFC 経由で場所スキャンが動作する", async () => {
      nfcSupHandle.current.setSupported(true);
      testDb.storageLocation.create({ id: "loc-1", label: "B-2" });
      await seedDbFromTestDb();

      await renderWithProviders(<ScanPage />);
      await flushPromises();

      act(() => {
        nfcRdrHandle.current.triggerScan("dwg://l/loc-1");
      });
      await flushPromises();

      expect(screen.getByText("場所を設定しました")).toBeInTheDocument();
    });
  });
});
