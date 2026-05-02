import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { testDb, FIXED_NOW } from "@/test/mocks/db";
import { seedDbFromTestDb } from "@/test/helpers/seedDb";
import { setupNextNavigation } from "@/test/mocks/modules/nextNavigation";
import { renderWithProviders } from "@/test/testUtils";
import { getDb } from "@/lib/db/dexie";
import { MS_PER_DAY } from "@/lib/constants";
import CaseDetailPage from "./page";

const navHandle = setupNextNavigation();

describe("CaseDetailPage (extra)", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
    setupNextNavigation({ params: { caseId: "case-1" } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ケース未発見時に「一覧に戻る」をクリックすると router.push が呼ばれる", async () => {
    await renderWithProviders(<CaseDetailPage />);

    const link = await screen.findByRole("button", { name: "一覧に戻る" });
    fireEvent.click(link);

    expect(navHandle.router.push).toHaveBeenCalledWith("/locations");
  });

  it("PageHeader の戻るボタンで router.back が呼ばれる", async () => {
    await renderWithProviders(<CaseDetailPage />);

    // PageHeader 内の戻るボタンは aria-label を持たない設計のため、順序で取得する
    const [backButton] = await screen.findAllByRole("button");
    expect(backButton).toBeDefined();
    if (backButton !== undefined) {
      fireEvent.click(backButton);
    }

    expect(navHandle.router.back).toHaveBeenCalled();
  });

  it("description がある場合に表示される", async () => {
    testDb.storageCase.create({
      id: "case-1",
      name: "ケースA",
      description: "春物用",
      rows: 2,
      cols: 2,
    });
    testDb.storageLocation.create({
      id: "loc-1",
      caseId: "case-1",
      label: "A-1",
    });
    await seedDbFromTestDb();

    await renderWithProviders(<CaseDetailPage />);

    expect(await screen.findByText("春物用")).toBeInTheDocument();
  });

  it("要確認バッジは需要があるときのみ表示される", async () => {
    testDb.storageCase.create({ id: "case-1", rows: 1, cols: 1 });
    testDb.storageLocation.create({
      id: "loc-1",
      caseId: "case-1",
      label: "A-1",
    });
    testDb.garment.create({
      id: "g-old",
      name: "古い服",
      locationId: "loc-1",
      status: "stored",
      lastScannedAt: FIXED_NOW - 60 * MS_PER_DAY,
      confidenceDecayDays: 30,
      confidenceDecayDaysOverride: 30,
    });
    await seedDbFromTestDb();

    await renderWithProviders(<CaseDetailPage />);

    expect(await screen.findByText("1着 要確認")).toBeInTheDocument();
  });

  it("StorageGrid 経由で編集モーダルを開いて StorageLocationEditForm を表示する", async () => {
    testDb.storageCase.create({ id: "case-1", name: "ケースA" });
    testDb.storageLocation.create({
      id: "loc-1",
      caseId: "case-1",
      label: "A-1",
    });
    await seedDbFromTestDb();

    await renderWithProviders(<CaseDetailPage />);

    fireEvent.click(await screen.findByText("A-1"));
    fireEvent.click(screen.getByRole("button", { name: "編集" }));

    expect(screen.getByText("ラベル: A-1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "保存" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "キャンセル" }),
    ).toBeInTheDocument();
  });

  it("StorageLocationEditForm 保存で Dexie の location が更新される", async () => {
    testDb.storageCase.create({ id: "case-1", name: "ケースA" });
    testDb.storageLocation.create({
      id: "loc-1",
      caseId: "case-1",
      label: "A-1",
    });
    await seedDbFromTestDb();

    await renderWithProviders(<CaseDetailPage />);

    fireEvent.click(await screen.findByText("A-1"));
    fireEvent.click(screen.getByRole("button", { name: "編集" }));

    const customNameInput = screen.getByLabelText("カスタム名称");
    fireEvent.change(customNameInput, { target: { value: "ワンピース用" } });

    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(async () => {
      const updated = await getDb().storageLocations.get("loc-1");
      expect(updated?.customName).toBe("ワンピース用");
    });
  });

  it("StorageLocationEditForm のキャンセルでフォームが閉じる", async () => {
    testDb.storageCase.create({ id: "case-1", name: "ケースA" });
    testDb.storageLocation.create({
      id: "loc-1",
      caseId: "case-1",
      label: "A-1",
    });
    await seedDbFromTestDb();

    await renderWithProviders(<CaseDetailPage />);

    fireEvent.click(await screen.findByText("A-1"));
    fireEvent.click(screen.getByRole("button", { name: "編集" }));

    expect(screen.getByText("ラベル: A-1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));

    await waitFor(() => {
      expect(screen.queryByText("ラベル: A-1")).toBeNull();
    });
  });

  describe("unit type case", () => {
    it("unit ケースで「ボックス」ラベルと服一覧を表示する", async () => {
      testDb.storageCase.create({
        id: "case-1",
        name: "コンテナ",
        type: "unit",
        rows: 1,
        cols: 1,
      });
      testDb.storageLocation.create({
        id: "loc-unit",
        caseId: "case-1",
        label: "container-loc",
      });
      testDb.garment.create({
        id: "g-1",
        name: "白いドレス",
        locationId: "loc-unit",
      });
      await seedDbFromTestDb();

      await renderWithProviders(<CaseDetailPage />);

      expect(await screen.findByText("ボックス")).toBeInTheDocument();
      expect(screen.getByText("白いドレス")).toBeInTheDocument();
    });

    it("unit ケースで服がない場合は空メッセージを表示する", async () => {
      testDb.storageCase.create({
        id: "case-1",
        name: "コンテナ",
        type: "unit",
      });
      testDb.storageLocation.create({
        id: "loc-unit",
        caseId: "case-1",
        label: "container-loc",
      });
      await seedDbFromTestDb();

      await renderWithProviders(<CaseDetailPage />);

      expect(
        await screen.findByText("このボックスには服がありません"),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "今ここにいなくても確認" }),
      ).toBeNull();
    });

    it("unit ケースで stored の服があると記憶確認ボタンを表示する", async () => {
      testDb.storageCase.create({
        id: "case-1",
        name: "コンテナ",
        type: "unit",
      });
      testDb.storageLocation.create({
        id: "loc-unit",
        caseId: "case-1",
        label: "container-loc",
      });
      testDb.garment.create({
        id: "g-1",
        name: "白いドレス",
        locationId: "loc-unit",
        status: "stored",
        lastScannedAt: FIXED_NOW - 30 * MS_PER_DAY,
      });
      await seedDbFromTestDb();

      await renderWithProviders(<CaseDetailPage />);

      const button = await screen.findByRole("button", {
        name: "今ここにいなくても確認",
      });
      fireEvent.click(button);

      await waitFor(async () => {
        const garment = await getDb().garments.get("g-1");
        expect(garment?.lastScannedAt).toBeGreaterThan(
          FIXED_NOW - 30 * MS_PER_DAY,
        );
      });
    });
  });
});
