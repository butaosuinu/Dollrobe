/* eslint-disable max-lines -- multiple integration scenarios for garment detail page */
import { describe, it, expect, vi, aroundEach } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { testDb, FIXED_NOW } from "@/test/mocks/db";
import { seedDbFromTestDb } from "@/test/helpers/seedDb";
import { setupNextNavigation } from "@/test/mocks/modules/nextNavigation";
import { renderWithProviders } from "@/test/testUtils";
import GarmentDetailPage from "./page";

const navHandle: { current: ReturnType<typeof setupNextNavigation> } = {
  current: setupNextNavigation(),
};

describe("GarmentDetailPage", () => {
  aroundEach(async (runTest) => {
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
    navHandle.current = setupNextNavigation({
      params: { id: "garment-1" },
    });

    await runTest();

    vi.restoreAllMocks();
  });

  it("服の詳細情報を表示する", async () => {
    testDb.garment.create({
      id: "garment-1",
      name: "白いドレス",
      category: "dress",
      dollSizes: ["MSD"],
    });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentDetailPage />);

    expect(screen.getByText("白いドレス")).toBeInTheDocument();
    expect(screen.getByText(/MSD/)).toBeInTheDocument();
  });

  it("タグを表示する", async () => {
    testDb.garment.create({
      id: "garment-1",
      tags: ["フォーマル", "レース"],
    });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentDetailPage />);

    expect(screen.getByText("フォーマル")).toBeInTheDocument();
    expect(screen.getByText("レース")).toBeInTheDocument();
  });

  it("色を表示する", async () => {
    testDb.garment.create({
      id: "garment-1",
      colors: ["hsl(0, 100%, 50%)", "hsl(240, 100%, 50%)"],
    });
    await seedDbFromTestDb();

    const { container } = await renderWithProviders(<GarmentDetailPage />);

    const colorDots = container.querySelectorAll(
      'span[style*="background-color"]',
    );
    expect(colorDots.length).toBe(2);
  });

  it("存在しない服の場合にメッセージを表示する", async () => {
    navHandle.current.setParams({ id: "non-existent" });

    await renderWithProviders(<GarmentDetailPage />);

    expect(await screen.findByText("服が見つかりません")).toBeInTheDocument();
    expect(screen.getByText("一覧に戻る")).toBeInTheDocument();
  });

  it("アーカイブボタンで確認後にナビゲーションする", async () => {
    testDb.garment.create({ id: "garment-1", name: "白いドレス" });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentDetailPage />);

    fireEvent.click(screen.getByText("アーカイブ"));

    const dialog = screen.getByRole("dialog");
    const confirmButton = within(dialog).getByRole("button", {
      name: "アーカイブ",
    });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(navHandle.current.router.push).toHaveBeenCalledWith("/garments");
    });
  });

  it("QR印刷ボタンで印刷ページに遷移する", async () => {
    testDb.garment.create({ id: "garment-1", name: "白いドレス" });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentDetailPage />);

    fireEvent.click(screen.getByText("QRを印刷"));

    expect(navHandle.current.router.push).toHaveBeenCalledWith(
      expect.stringContaining("/print?"),
    );
    expect(navHandle.current.router.push).toHaveBeenCalledWith(
      expect.stringContaining("type=garment"),
    );
    expect(navHandle.current.router.push).toHaveBeenCalledWith(
      expect.stringContaining("ids=garment-1"),
    );
  });

  describe("収納場所の手動変更", () => {
    it("収納場所が未設定の服で「未配置」と「場所を設定」を表示する", async () => {
      testDb.garment.create({
        id: "garment-1",
        status: "checked_out",
      });
      await seedDbFromTestDb();

      await renderWithProviders(<GarmentDetailPage />);

      expect(screen.getByText("未配置")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /場所を設定/ }),
      ).toBeInTheDocument();
    });

    it("収納場所が設定済みの服で「ケース名 - ラベル」と「変更」を表示する", async () => {
      testDb.storageCase.create({
        id: "case-1",
        name: "衣装ケース A",
        rows: 2,
        cols: 2,
      });
      testDb.storageLocation.create({
        id: "loc-1",
        caseId: "case-1",
        label: "A-1",
        row: 0,
        col: 0,
      });
      testDb.garment.create({
        id: "garment-1",
        locationId: "loc-1",
        status: "stored",
      });
      await seedDbFromTestDb();

      await renderWithProviders(<GarmentDetailPage />);

      expect(screen.getByText("衣装ケース A - A-1")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /変更/ })).toBeInTheDocument();
    });

    it("「場所を設定」クリックで LocationPicker が開く", async () => {
      const user = userEvent.setup();
      testDb.storageCase.create({ id: "case-1", rows: 1, cols: 1 });
      testDb.storageLocation.create({
        id: "loc-1",
        caseId: "case-1",
        label: "A-1",
        row: 0,
        col: 0,
      });
      testDb.garment.create({
        id: "garment-1",
        status: "checked_out",
      });
      await seedDbFromTestDb();

      await renderWithProviders(<GarmentDetailPage />);

      await user.click(screen.getByRole("button", { name: /場所を設定/ }));

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("収納場所が0件の場合、空状態メッセージを表示する", async () => {
      const user = userEvent.setup();
      testDb.garment.create({
        id: "garment-1",
        status: "checked_out",
      });
      await seedDbFromTestDb();

      await renderWithProviders(<GarmentDetailPage />);

      await user.click(screen.getByRole("button", { name: /場所を設定/ }));

      expect(screen.getByText("収納場所がありません")).toBeInTheDocument();
    });

    it("ケースが1件の場合、グリッドを直接表示する", async () => {
      const user = userEvent.setup();
      testDb.storageCase.create({
        id: "case-1",
        name: "衣装ケース A",
        rows: 1,
        cols: 2,
      });
      testDb.storageLocation.create({
        id: "loc-1",
        caseId: "case-1",
        label: "A-1",
        row: 0,
        col: 0,
      });
      testDb.storageLocation.create({
        id: "loc-2",
        caseId: "case-1",
        label: "A-2",
        row: 0,
        col: 1,
      });
      testDb.garment.create({
        id: "garment-1",
        status: "checked_out",
      });
      await seedDbFromTestDb();

      await renderWithProviders(<GarmentDetailPage />);

      await user.click(screen.getByRole("button", { name: /場所を設定/ }));

      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByText("A-1")).toBeInTheDocument();
      expect(within(dialog).getByText("A-2")).toBeInTheDocument();
    });

    it("ケースが複数の場合、ケース一覧を先に表示し、選択でグリッドに切り替わる", async () => {
      const user = userEvent.setup();
      testDb.storageCase.create({
        id: "case-1",
        name: "衣装ケース A",
        rows: 1,
        cols: 1,
      });
      testDb.storageCase.create({
        id: "case-2",
        name: "衣装ケース B",
        rows: 1,
        cols: 1,
      });
      testDb.storageLocation.create({
        id: "loc-1",
        caseId: "case-1",
        label: "A-1",
        row: 0,
        col: 0,
      });
      testDb.storageLocation.create({
        id: "loc-2",
        caseId: "case-2",
        label: "A-1",
        row: 0,
        col: 0,
      });
      testDb.garment.create({
        id: "garment-1",
        status: "checked_out",
      });
      await seedDbFromTestDb();

      await renderWithProviders(<GarmentDetailPage />);

      await user.click(screen.getByRole("button", { name: /場所を設定/ }));

      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByText("衣装ケース A")).toBeInTheDocument();
      expect(within(dialog).getByText("衣装ケース B")).toBeInTheDocument();

      await user.click(within(dialog).getByText("衣装ケース A"));

      expect(within(dialog).getByText("A-1")).toBeInTheDocument();
      expect(within(dialog).getByText("ケース一覧")).toBeInTheDocument();
    });

    it("収納場所が設定済みの場合「未配置にする」ボタンを表示する", async () => {
      const user = userEvent.setup();
      testDb.storageCase.create({ id: "case-1", rows: 1, cols: 1 });
      testDb.storageLocation.create({
        id: "loc-1",
        caseId: "case-1",
        label: "A-1",
        row: 0,
        col: 0,
      });
      testDb.garment.create({
        id: "garment-1",
        locationId: "loc-1",
        status: "stored",
      });
      await seedDbFromTestDb();

      await renderWithProviders(<GarmentDetailPage />);

      await user.click(screen.getByRole("button", { name: /変更/ }));

      const dialog = screen.getByRole("dialog");
      expect(
        within(dialog).getByRole("button", { name: /未配置にする/ }),
      ).toBeInTheDocument();
    });

    it("収納場所が未設定の場合「未配置にする」ボタンを表示しない", async () => {
      const user = userEvent.setup();
      testDb.storageCase.create({ id: "case-1", rows: 1, cols: 1 });
      testDb.storageLocation.create({
        id: "loc-1",
        caseId: "case-1",
        label: "A-1",
        row: 0,
        col: 0,
      });
      testDb.garment.create({
        id: "garment-1",
        status: "checked_out",
      });
      await seedDbFromTestDb();

      await renderWithProviders(<GarmentDetailPage />);

      await user.click(screen.getByRole("button", { name: /場所を設定/ }));

      const dialog = screen.getByRole("dialog");
      expect(
        within(dialog).queryByRole("button", { name: /未配置にする/ }),
      ).not.toBeInTheDocument();
    });

    it("グリッドからセルを選択すると garment が stored に更新される", async () => {
      const user = userEvent.setup();
      testDb.storageCase.create({ id: "case-1", rows: 1, cols: 2 });
      testDb.storageLocation.create({
        id: "loc-1",
        caseId: "case-1",
        label: "A-1",
        row: 0,
        col: 0,
      });
      testDb.storageLocation.create({
        id: "loc-2",
        caseId: "case-1",
        label: "A-2",
        row: 0,
        col: 1,
      });
      testDb.garment.create({
        id: "garment-1",
        status: "checked_out",
      });
      await seedDbFromTestDb();

      await renderWithProviders(<GarmentDetailPage />);

      await user.click(screen.getByRole("button", { name: /場所を設定/ }));

      const dialog = screen.getByRole("dialog");
      await user.click(within(dialog).getByText("A-2"));

      const { getDb } = await import("@/lib/db/dexie");
      const db = getDb();
      await waitFor(async () => {
        const garment = await db.garments.get("garment-1");
        expect(garment?.locationId).toBe("loc-2");
      });
      const garment = await db.garments.get("garment-1");
      expect(garment?.status).toBe("stored");
      expect(garment?.lastScannedAt).toBe(FIXED_NOW);
      expect(garment?.checkedOutAt).toBeUndefined();
    });

    it("複数ケース (grid + unit) で unit ケースをクリックすると即座にその location が選ばれる", async () => {
      const user = userEvent.setup();
      testDb.storageCase.create({
        id: "case-grid",
        name: "引き出し",
        type: "grid",
        rows: 1,
        cols: 1,
      });
      testDb.storageLocation.create({
        id: "loc-grid",
        caseId: "case-grid",
        label: "A-1",
        row: 0,
        col: 0,
      });
      testDb.storageCase.create({
        id: "case-unit",
        name: "ボックスケース",
        type: "unit",
        rows: 1,
        cols: 1,
      });
      testDb.storageLocation.create({
        id: "loc-unit",
        caseId: "case-unit",
        label: "ボックスケース",
        row: 0,
        col: 0,
      });
      testDb.garment.create({
        id: "garment-1",
        status: "checked_out",
      });
      await seedDbFromTestDb();

      await renderWithProviders(<GarmentDetailPage />);
      await user.click(screen.getByRole("button", { name: /場所を設定/ }));

      const dialog = screen.getByRole("dialog");
      // ケース一覧から "ボックスケース" をクリックすると即座に locationId が確定
      await user.click(within(dialog).getByText("ボックスケース"));

      const { getDb } = await import("@/lib/db/dexie");
      const db = getDb();
      await waitFor(async () => {
        const g = await db.garments.get("garment-1");
        expect(g?.locationId).toBe("loc-unit");
      });
    });

    it("複数行 grid を LocationPicker で開くと row 順に並ぶ", async () => {
      const user = userEvent.setup();
      testDb.storageCase.create({
        id: "case-1",
        name: "ケース",
        rows: 2,
        cols: 1,
      });
      testDb.storageLocation.create({
        id: "loc-2",
        caseId: "case-1",
        label: "B-1",
        row: 1,
        col: 0,
      });
      testDb.storageLocation.create({
        id: "loc-1",
        caseId: "case-1",
        label: "A-1",
        row: 0,
        col: 0,
      });
      testDb.garment.create({
        id: "garment-1",
        status: "checked_out",
      });
      await seedDbFromTestDb();

      await renderWithProviders(<GarmentDetailPage />);
      await user.click(screen.getByRole("button", { name: /場所を設定/ }));

      const dialog = screen.getByRole("dialog");
      // 投入順は B-1 → A-1 だが、LocationPicker は row 昇順で並べるはず。
      // 単に両 label が存在することだけでなく、DOM 順序まで確認する。
      const labels = within(dialog).getAllByText(/^[AB]-1$/u);
      expect(labels.map((el) => el.textContent)).toEqual(["A-1", "B-1"]);
    });

    it("unit 型ケースを LocationPicker で選択できる", async () => {
      const user = userEvent.setup();
      testDb.storageCase.create({
        id: "case-unit",
        name: "押入れ",
        type: "unit",
        rows: 1,
        cols: 1,
      });
      testDb.storageLocation.create({
        id: "loc-unit",
        caseId: "case-unit",
        label: "押入れ",
        row: 0,
        col: 0,
      });
      testDb.garment.create({
        id: "garment-1",
        status: "checked_out",
      });
      await seedDbFromTestDb();

      await renderWithProviders(<GarmentDetailPage />);

      await user.click(screen.getByRole("button", { name: /場所を設定/ }));
      const dialog = screen.getByRole("dialog");
      // unit 型は "ボックス" ラベルが付く
      expect(within(dialog).getByText("ボックス")).toBeInTheDocument();
    });

    it("lost 状態の服は '紛失' ラベルのバッジで表示される", async () => {
      testDb.garment.create({
        id: "garment-1",
        name: "紛失中ドレス",
        status: "lost",
        locationId: undefined,
      });
      await seedDbFromTestDb();
      await renderWithProviders(<GarmentDetailPage />);
      expect(screen.getByText("紛失中ドレス")).toBeInTheDocument();
      // GARMENT_STATUS_LABEL.lost = msg`紛失` (Badge の text として描画される)。
      // "ステータス" ラベル横にこの文字列が表示されることで lost 経路を直接検証。
      expect(screen.getByText("紛失")).toBeInTheDocument();
    });

    it("ブランドが設定された服はブランド情報行が描画される", async () => {
      testDb.garment.create({
        id: "garment-1",
        name: "セット服",
        brand: "メーカーX",
      });
      await seedDbFromTestDb();
      await renderWithProviders(<GarmentDetailPage />);
      expect(screen.getByText("セット服")).toBeInTheDocument();
      expect(screen.getByText("メーカーX")).toBeInTheDocument();
    });

    it("画像 URL がある服は img タグが描画される", async () => {
      testDb.garment.create({
        id: "garment-1",
        name: "白いドレス",
        imageUrl: "https://example.com/g.png",
      });
      await seedDbFromTestDb();

      await renderWithProviders(<GarmentDetailPage />);

      const img = screen.getByAltText("白いドレス");
      expect(img).toHaveAttribute("src", "https://example.com/g.png");
    });

    it("ブランドが設定されている服はブランド名が表示される", async () => {
      testDb.garment.create({
        id: "garment-1",
        name: "白いドレス",
        brand: "アゾン",
      });
      await seedDbFromTestDb();

      await renderWithProviders(<GarmentDetailPage />);

      expect(screen.getByText("アゾン")).toBeInTheDocument();
    });

    it("アーカイブ済み服は復元 / 完全に削除ボタンを表示する", async () => {
      testDb.garment.create({
        id: "garment-1",
        name: "白いドレス",
        archivedAt: FIXED_NOW - 86_400_000,
      });
      await seedDbFromTestDb();

      await renderWithProviders(<GarmentDetailPage />);

      expect(screen.getByText("復元")).toBeInTheDocument();
      expect(screen.getByText("完全に削除")).toBeInTheDocument();
    });

    it("アーカイブ済み服の復元ボタンで /garments に戻る", async () => {
      testDb.garment.create({
        id: "garment-1",
        archivedAt: FIXED_NOW - 86_400_000,
      });
      await seedDbFromTestDb();

      await renderWithProviders(<GarmentDetailPage />);

      fireEvent.click(screen.getByText("復元"));

      await waitFor(() => {
        expect(navHandle.current.router.push).toHaveBeenCalledWith("/garments");
      });
    });

    it("アーカイブ済み服の完全削除確認後に /archive に遷移する", async () => {
      testDb.garment.create({
        id: "garment-1",
        archivedAt: FIXED_NOW - 86_400_000,
      });
      await seedDbFromTestDb();

      await renderWithProviders(<GarmentDetailPage />);

      fireEvent.click(screen.getByText("完全に削除"));

      const dialog = screen.getByRole("dialog");
      const confirmButton = within(dialog).getByRole("button", {
        name: "削除",
      });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(navHandle.current.router.push).toHaveBeenCalledWith("/archive");
      });
    });

    it("存在しない服で「一覧に戻る」を押すと /garments に遷移する", async () => {
      navHandle.current.setParams({ id: "non-existent" });

      await renderWithProviders(<GarmentDetailPage />);

      fireEvent.click(await screen.findByText("一覧に戻る"));

      expect(navHandle.current.router.push).toHaveBeenCalledWith("/garments");
    });

    it("「未配置にする」クリックで garment が checked_out に更新される", async () => {
      const user = userEvent.setup();
      testDb.storageCase.create({ id: "case-1", rows: 1, cols: 1 });
      testDb.storageLocation.create({
        id: "loc-1",
        caseId: "case-1",
        label: "A-1",
        row: 0,
        col: 0,
      });
      testDb.garment.create({
        id: "garment-1",
        locationId: "loc-1",
        status: "stored",
      });
      await seedDbFromTestDb();

      await renderWithProviders(<GarmentDetailPage />);

      await user.click(screen.getByRole("button", { name: /変更/ }));

      const dialog = screen.getByRole("dialog");
      await user.click(
        within(dialog).getByRole("button", { name: /未配置にする/ }),
      );

      const { getDb } = await import("@/lib/db/dexie");
      const db = getDb();
      await waitFor(async () => {
        const garment = await db.garments.get("garment-1");
        expect(garment?.status).toBe("checked_out");
      });
      const garment = await db.garments.get("garment-1");
      expect(garment?.locationId).toBeUndefined();
      expect(garment?.checkedOutAt).toBe(FIXED_NOW);
    });
  });
});
