import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { testDb, FIXED_NOW } from "@/test/mocks/db";
import { seedDbFromTestDb } from "@/test/helpers/seedDb";
import { renderWithProviders } from "@/test/testUtils";
import GarmentEditPage from "./page";

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

const mockUpload = vi.hoisted(() => vi.fn());
const mockResetUpload = vi.hoisted(() => vi.fn());
const mockUploadState = vi.hoisted(() => ({
  value: { status: "idle" } as
    | { status: "idle" }
    | { status: "compressing" }
    | { status: "uploading" }
    | { status: "success"; imageUrl: string }
    | { status: "error"; message: string },
}));

vi.mock("@/hooks/useImageUpload", () => ({
  useImageUpload: () => ({
    uploadState: mockUploadState.value,
    upload: mockUpload,
    reset: mockResetUpload,
  }),
}));

vi.mock("@paralleldrive/cuid2", () => ({
  createId: () => "test-cuid",
}));

describe("GarmentEditPage", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
    mockRouter.push.mockClear();
    mockRouter.back.mockClear();
    mockUpload.mockClear();
    mockResetUpload.mockClear();
    mockUploadState.value = { status: "idle" };
    mockParams.value = { id: "garment-1" };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ページタイトル「服を編集」が表示される", async () => {
    testDb.garment.create({ id: "garment-1" });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentEditPage />);

    expect(
      screen.getByRole("heading", { name: "服を編集" }),
    ).toBeInTheDocument();
  });

  it("既存の服データがフォームに初期値として入力されている", async () => {
    testDb.garment.create({
      id: "garment-1",
      name: "白いドレス",
      category: "dress",
      dollSizes: ["MSD"],
      brand: "ボークス",
    });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentEditPage />);

    expect(screen.getByLabelText("名前")).toHaveValue("白いドレス");
    expect(screen.getByLabelText("カテゴリ")).toHaveValue("dress");
    expect(screen.getByLabelText("ブランド/メーカー")).toHaveValue("ボークス");
  });

  it("更新ボタンが表示される（登録するではなく）", async () => {
    testDb.garment.create({ id: "garment-1" });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentEditPage />);

    expect(
      screen.getByRole("button", { name: "更新する" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "登録する" }),
    ).not.toBeInTheDocument();
  });

  it("存在しない服の場合にメッセージを表示する", async () => {
    mockParams.value = { id: "non-existent" };

    await renderWithProviders(<GarmentEditPage />);

    expect(await screen.findByText("服が見つかりません")).toBeInTheDocument();
    expect(screen.getByText("一覧に戻る")).toBeInTheDocument();
  });

  it("「一覧に戻る」クリックで /garments にナビゲーションする", async () => {
    const user = userEvent.setup();
    mockParams.value = { id: "non-existent" };

    await renderWithProviders(<GarmentEditPage />);

    await user.click(await screen.findByText("一覧に戻る"));

    expect(mockRouter.push).toHaveBeenCalledWith("/garments");
  });

  it("戻るボタンで router.back() が呼ばれる", async () => {
    const user = userEvent.setup();
    testDb.garment.create({ id: "garment-1" });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentEditPage />);

    await user.click(screen.getByRole("button", { name: "戻る" }));

    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });

  it("名前を変更して送信するとDexieの服が更新される", async () => {
    const user = userEvent.setup();
    testDb.garment.create({ id: "garment-1", name: "白いドレス" });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentEditPage />);

    const nameInput = screen.getByLabelText("名前");
    await user.clear(nameInput);
    await user.type(nameInput, "赤いドレス");
    await user.click(screen.getByRole("button", { name: "更新する" }));

    const { getDb } = await import("@/lib/db/dexie");
    const db = getDb();
    await waitFor(async () => {
      const garment = await db.garments.get("garment-1");
      expect(garment?.name).toBe("赤いドレス");
    });
  });

  it("送信後に詳細ページにナビゲーションする", async () => {
    const user = userEvent.setup();
    testDb.garment.create({ id: "garment-1", name: "白いドレス" });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentEditPage />);

    await user.click(screen.getByRole("button", { name: "更新する" }));

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith("/garments/garment-1");
    });
  });

  it("カテゴリを変更して送信すると反映される", async () => {
    const user = userEvent.setup();
    testDb.garment.create({ id: "garment-1", category: "dress" });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentEditPage />);

    await user.selectOptions(screen.getByLabelText("カテゴリ"), "tops");
    await user.click(screen.getByRole("button", { name: "更新する" }));

    const { getDb } = await import("@/lib/db/dexie");
    const db = getDb();
    await waitFor(async () => {
      const garment = await db.garments.get("garment-1");
      expect(garment?.category).toBe("tops");
    });
  });

  it("編集時に元の id, userId, status, locationId が保持される", async () => {
    const user = userEvent.setup();
    testDb.garment.create({
      id: "garment-1",
      userId: "user-1",
      status: "stored",
      locationId: "loc-1",
    });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentEditPage />);

    await user.click(screen.getByRole("button", { name: "更新する" }));

    const { getDb } = await import("@/lib/db/dexie");
    const db = getDb();
    await waitFor(async () => {
      const garment = await db.garments.get("garment-1");
      expect(garment?.id).toBe("garment-1");
      expect(garment?.userId).toBe("user-1");
      expect(garment?.status).toBe("stored");
      expect(garment?.locationId).toBe("loc-1");
    });
  });

  it("addGarmentAtom は呼ばれない（更新のみ実行される）", async () => {
    const user = userEvent.setup();
    testDb.garment.create({ id: "garment-1", name: "白いドレス" });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentEditPage />);

    await user.click(screen.getByRole("button", { name: "更新する" }));

    const { getDb } = await import("@/lib/db/dexie");
    const db = getDb();
    await waitFor(async () => {
      const garments = await db.garments.toArray();
      expect(garments.length).toBe(1);
      expect(garments[0]?.id).toBe("garment-1");
    });
  });

  it("名前を空にすると更新ボタンがdisabledになる", async () => {
    const user = userEvent.setup();
    testDb.garment.create({ id: "garment-1", name: "白いドレス" });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentEditPage />);

    await user.clear(screen.getByLabelText("名前"));

    expect(screen.getByRole("button", { name: "更新する" })).toBeDisabled();
  });

  it("アップロード中はボタンが disabled になる", async () => {
    mockUploadState.value = { status: "uploading" };
    testDb.garment.create({ id: "garment-1" });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentEditPage />);

    expect(
      screen.getByRole("button", { name: "アップロード中..." }),
    ).toBeDisabled();
  });
});
