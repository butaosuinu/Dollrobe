import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { testDb, FIXED_NOW } from "@/test/mocks/db";
import { seedDbFromTestDb } from "@/test/helpers/seedDb";
import { renderWithProviders } from "@/test/testUtils";
import GarmentDetailPage from "./page";

const mockRouter = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
}));

const mockParams = vi.hoisted((): { value: Record<string, string> } => ({
  value: { id: "garment-1" },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  useParams: () => mockParams.value,
}));

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

describe("GarmentDetailPage", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
    mockRouter.push.mockClear();
    mockParams.value = { id: "garment-1" };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("服の詳細情報を表示する", async () => {
    testDb.garment.create({
      id: "garment-1",
      name: "白いドレス",
      category: "dress",
      dollSize: "MSD",
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
    mockParams.value = { id: "non-existent" };

    await renderWithProviders(<GarmentDetailPage />);

    expect(await screen.findByText("服が見つかりません")).toBeInTheDocument();
    expect(screen.getByText("一覧に戻る")).toBeInTheDocument();
  });

  it("削除ボタンで服を削除しナビゲーションする", async () => {
    testDb.garment.create({ id: "garment-1", name: "白いドレス" });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentDetailPage />);

    fireEvent.click(screen.getByText("削除"));

    const { db } = await import("@/lib/db/dexie");
    await waitFor(async () => {
      const garment = await db.garments.get("garment-1");
      expect(garment).toBeUndefined();
    });
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith("/garments");
    });
  });

  it("QR印刷ボタンで印刷ページに遷移する", async () => {
    testDb.garment.create({ id: "garment-1", name: "白いドレス" });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentDetailPage />);

    fireEvent.click(screen.getByText("QRを印刷"));

    expect(mockRouter.push).toHaveBeenCalledWith(
      expect.stringContaining("/print?"),
    );
    expect(mockRouter.push).toHaveBeenCalledWith(
      expect.stringContaining("type=garment"),
    );
    expect(mockRouter.push).toHaveBeenCalledWith(
      expect.stringContaining("ids=garment-1"),
    );
  });

  describe("収納場所の手動変更", () => {
    it("収納場所が未設定の服で「未配置」と「場所を設定」を表示する", async () => {
      testDb.garment.create({
        id: "garment-1",
        locationId: null,
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
        locationId: null,
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
        locationId: null,
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
        locationId: null,
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
        locationId: null,
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
        locationId: null,
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
        locationId: null,
        status: "checked_out",
      });
      await seedDbFromTestDb();

      await renderWithProviders(<GarmentDetailPage />);

      await user.click(screen.getByRole("button", { name: /場所を設定/ }));

      const dialog = screen.getByRole("dialog");
      await user.click(within(dialog).getByText("A-2"));

      const { db } = await import("@/lib/db/dexie");
      await waitFor(async () => {
        const garment = await db.garments.get("garment-1");
        expect(garment?.locationId).toBe("loc-2");
      });
      const garment = await db.garments.get("garment-1");
      expect(garment?.status).toBe("stored");
      expect(garment?.lastScannedAt).toBe(FIXED_NOW);
      expect(garment?.checkedOutAt).toBeUndefined();
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

      const { db } = await import("@/lib/db/dexie");
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
