import { describe, it, expect, vi, aroundEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { testDb, FIXED_NOW } from "@/test/mocks/db";
import { seedDbFromTestDb } from "@/test/helpers/seedDb";
import { renderWithProviders } from "@/test/testUtils";
import { MS_PER_DAY } from "@/lib/constants";
import LocationsPage from "./page";

const withFixedNow = async (runTest: () => Promise<void>) => {
  vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);

  await runTest();

  vi.restoreAllMocks();
};

describe("LocationsPage", () => {
  aroundEach(withFixedNow);

  it("収納場所がない場合に空状態を表示する", async () => {
    await renderWithProviders(<LocationsPage />);

    expect(
      await screen.findByText("まだ収納場所がありません"),
    ).toBeInTheDocument();
  });

  it("ケースの名前と行列数を表示する", async () => {
    testDb.storageCase.create({
      id: "case-1",
      name: "衣装ケース A",
      rows: 3,
      cols: 3,
    });
    testDb.storageLocation.create({
      id: "loc-1",
      caseId: "case-1",
      label: "A-1",
    });
    await seedDbFromTestDb();

    await renderWithProviders(<LocationsPage />);

    expect(screen.getByText("衣装ケース A")).toBeInTheDocument();
    expect(screen.getByText("3行 x 3列")).toBeInTheDocument();
  });

  it("グリッドセルのラベルを表示する", async () => {
    testDb.storageCase.create({ id: "case-1" });
    testDb.storageLocation.create({
      id: "loc-1",
      caseId: "case-1",
      label: "A-1",
    });
    testDb.storageLocation.create({
      id: "loc-2",
      caseId: "case-1",
      label: "A-2",
      col: 1,
    });
    await seedDbFromTestDb();

    await renderWithProviders(<LocationsPage />);

    expect(screen.getByText("A-1")).toBeInTheDocument();
    expect(screen.getByText("A-2")).toBeInTheDocument();
  });

  it("セルに服数を表示する", async () => {
    testDb.storageCase.create({ id: "case-1" });
    testDb.storageLocation.create({
      id: "loc-1",
      caseId: "case-1",
      label: "A-1",
    });
    testDb.garment.create({ id: "g-1", locationId: "loc-1" });
    testDb.garment.create({ id: "g-2", locationId: "loc-1" });
    await seedDbFromTestDb();

    await renderWithProviders(<LocationsPage />);

    expect(screen.getAllByText("2着").length).toBeGreaterThanOrEqual(1);
  });

  it("セルクリックでBottomSheetを開き服一覧を表示する", async () => {
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

    await renderWithProviders(<LocationsPage />);

    fireEvent.click(screen.getByText("A-1"));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("白いドレス")).toBeInTheDocument();
  });

  it("空のセルクリックで服がないメッセージを表示する", async () => {
    testDb.storageCase.create({ id: "case-1", name: "衣装ケース A" });
    testDb.storageLocation.create({
      id: "loc-1",
      caseId: "case-1",
      label: "A-1",
    });
    await seedDbFromTestDb();

    await renderWithProviders(<LocationsPage />);

    fireEvent.click(screen.getByText("A-1"));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("この場所には服がありません")).toBeInTheDocument();
  });

  it("BottomSheetの閉じるボタンでシートを閉じる", async () => {
    testDb.storageCase.create({ id: "case-1", name: "衣装ケース A" });
    testDb.storageLocation.create({
      id: "loc-1",
      caseId: "case-1",
      label: "A-1",
    });
    await seedDbFromTestDb();

    await renderWithProviders(<LocationsPage />);

    fireEvent.click(screen.getByText("A-1"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("閉じる"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("ケースカードにアイテム数サマリーを表示する", async () => {
    testDb.storageCase.create({ id: "case-1" });
    testDb.storageLocation.create({
      id: "loc-1",
      caseId: "case-1",
      label: "A-1",
    });
    testDb.garment.create({ id: "g-1", locationId: "loc-1" });
    testDb.garment.create({ id: "g-2", locationId: "loc-1" });
    testDb.garment.create({ id: "g-3", locationId: "loc-1" });
    await seedDbFromTestDb();

    await renderWithProviders(<LocationsPage />);

    expect(screen.getAllByText("3着").length).toBeGreaterThanOrEqual(1);
  });

  it("要確認の服がある場合に要確認バッジを表示する", async () => {
    const twentyFiveDaysAgo = FIXED_NOW - MS_PER_DAY * 25;
    testDb.storageCase.create({ id: "case-1" });
    testDb.storageLocation.create({
      id: "loc-1",
      caseId: "case-1",
      label: "A-1",
    });
    testDb.garment.create({
      id: "g-1",
      locationId: "loc-1",
      lastScannedAt: FIXED_NOW,
    });
    testDb.garment.create({
      id: "g-2",
      locationId: "loc-1",
      lastScannedAt: twentyFiveDaysAgo,
      confidenceDecayDays: 30,
    });
    await seedDbFromTestDb();

    await renderWithProviders(<LocationsPage />);

    expect(screen.getByText("1着 要確認")).toBeInTheDocument();
  });
});

describe("LocationsPage CRUD操作", () => {
  aroundEach(withFixedNow);

  it("FABボタンクリックでケース作成シートを開く", async () => {
    await renderWithProviders(<LocationsPage />);

    fireEvent.click(screen.getByLabelText("ケースを追加"));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("ケース名")).toBeInTheDocument();
  });

  it("EmptyStateのアクションボタンでケース作成シートを開く", async () => {
    await renderWithProviders(<LocationsPage />);

    const buttons = screen.getAllByRole("button", { name: "ケースを追加" });
    const firstButton = buttons[0];
    expect(firstButton).toBeDefined();
    if (firstButton === undefined) return;
    fireEvent.click(firstButton);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("ケース作成フォーム送信でDexieにケースが作成される", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<LocationsPage />);

    fireEvent.click(screen.getByLabelText("ケースを追加"));
    const nameInput = screen.getByLabelText("ケース名");
    await user.clear(nameInput);
    await user.type(nameInput, "新しいケース");
    fireEvent.click(screen.getByRole("button", { name: "作成" }));

    const { getDb } = await import("@/lib/db/dexie");
    const db = getDb();
    await waitFor(async () => {
      const cases = await db.storageCases.toArray();
      expect(cases.length).toBe(1);
      expect(cases[0]?.name).toBe("新しいケース");
    });
  });

  it("編集ボタンクリックでケース編集シートを開く", async () => {
    testDb.storageCase.create({ id: "case-1", name: "衣装ケース A" });
    testDb.storageLocation.create({ id: "loc-1", caseId: "case-1" });
    await seedDbFromTestDb();

    await renderWithProviders(<LocationsPage />);

    fireEvent.click(screen.getByLabelText("編集"));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByDisplayValue("衣装ケース A")).toBeInTheDocument();
  });

  it("ケース編集フォーム送信でDexieのケースが更新される", async () => {
    const user = userEvent.setup();
    testDb.storageCase.create({ id: "case-1", name: "衣装ケース A" });
    testDb.storageLocation.create({ id: "loc-1", caseId: "case-1" });
    await seedDbFromTestDb();

    await renderWithProviders(<LocationsPage />);

    fireEvent.click(screen.getByLabelText("編集"));
    const input = screen.getByDisplayValue("衣装ケース A");
    await user.clear(input);
    await user.type(input, "衣装ケース B");
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    const { getDb } = await import("@/lib/db/dexie");
    const db = getDb();
    await waitFor(async () => {
      const storageCase = await db.storageCases.get("case-1");
      expect(storageCase?.name).toBe("衣装ケース B");
    });
  });

  it("削除ボタンクリックで確認シートを開く", async () => {
    testDb.storageCase.create({ id: "case-1", name: "衣装ケース A" });
    testDb.storageLocation.create({ id: "loc-1", caseId: "case-1" });
    await seedDbFromTestDb();

    await renderWithProviders(<LocationsPage />);

    fireEvent.click(screen.getByLabelText("削除"));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByText(/「衣装ケース A」を削除しますか/u),
    ).toBeInTheDocument();
  });

  it("削除確認でDexieからケースが削除される", async () => {
    testDb.storageCase.create({ id: "case-1", name: "衣装ケース A" });
    testDb.storageLocation.create({ id: "loc-1", caseId: "case-1" });
    await seedDbFromTestDb();

    await renderWithProviders(<LocationsPage />);

    fireEvent.click(screen.getByLabelText("削除"));
    const deleteButtons = screen.getAllByRole("button", { name: "削除" });
    const lastDeleteButton = deleteButtons[deleteButtons.length - 1];
    expect(lastDeleteButton).toBeDefined();
    if (lastDeleteButton === undefined) return;
    fireEvent.click(lastDeleteButton);

    const { getDb } = await import("@/lib/db/dexie");
    const db = getDb();
    await waitFor(async () => {
      const cases = await db.storageCases.toArray();
      expect(cases.length).toBe(0);
    });
  });

  it("削除でケース内の服が取り出し中になる", async () => {
    testDb.storageCase.create({ id: "case-1", name: "衣装ケース A" });
    testDb.storageLocation.create({ id: "loc-1", caseId: "case-1" });
    testDb.garment.create({
      id: "g-1",
      locationId: "loc-1",
      status: "stored",
    });
    await seedDbFromTestDb();

    await renderWithProviders(<LocationsPage />);

    fireEvent.click(screen.getByLabelText("削除"));
    const deleteButtons = screen.getAllByRole("button", { name: "削除" });
    const lastDeleteButton = deleteButtons[deleteButtons.length - 1];
    expect(lastDeleteButton).toBeDefined();
    if (lastDeleteButton === undefined) return;
    fireEvent.click(lastDeleteButton);

    const { getDb } = await import("@/lib/db/dexie");
    const db = getDb();
    await waitFor(async () => {
      const g = await db.garments.get("g-1");
      expect(g?.status).toBe("checked_out");
      expect(g?.locationId).toBeUndefined();
    });
  });

  it("ユニットケース (ボックス) として作成できる", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<LocationsPage />);

    fireEvent.click(screen.getByLabelText("ケースを追加"));
    fireEvent.click(screen.getByRole("button", { name: "ボックス" }));
    const nameInput = screen.getByLabelText("ケース名");
    await user.clear(nameInput);
    await user.type(nameInput, "押し入れ");
    fireEvent.click(screen.getByRole("button", { name: "作成" }));

    const { getDb } = await import("@/lib/db/dexie");
    const db = getDb();
    await waitFor(async () => {
      const cases = await db.storageCases.toArray();
      expect(cases.length).toBe(1);
      expect(cases[0]?.type).toBe("unit");
    });
  });

  it("ケース作成シートのキャンセルでシートが閉じる", async () => {
    await renderWithProviders(<LocationsPage />);

    fireEvent.click(screen.getByLabelText("ケースを追加"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("ケース名を空にすると作成ボタンが無効化される", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<LocationsPage />);

    fireEvent.click(screen.getByLabelText("ケースを追加"));
    const nameInput = screen.getByLabelText("ケース名");
    await user.clear(nameInput);

    const submit = screen.getByRole("button", { name: "作成" });
    expect(submit).toBeDisabled();
  });
});
