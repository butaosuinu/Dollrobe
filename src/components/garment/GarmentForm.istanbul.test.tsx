import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FIXED_NOW, createTestGarment } from "@/test/factories";
import { renderWithProviders } from "@/test/testUtils";
import GarmentForm from "./GarmentForm";

const mockRouter = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
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

vi.mock("@/hooks/useBrandSuggestions", () => ({
  useBrandSuggestions: () => [],
}));

const mockExtractColors = vi.hoisted(() => vi.fn());
const mockExtractionState = vi.hoisted(() => ({
  value: { status: "idle" } as
    | { status: "idle" }
    | { status: "loading" }
    | { status: "done"; colors: readonly string[] }
    | { status: "error" },
}));

vi.mock("@/hooks/useColorExtraction", () => ({
  useColorExtraction: () => ({
    extractionState: mockExtractionState.value,
    extractColors: mockExtractColors,
    reset: vi.fn(),
  }),
}));

const TIMEOUT_MS = 3000;

const createPngFile = (name = "test.png"): File =>
  new File(["dummy"], name, { type: "image/png" });

const fireFileSelect = (file: File): void => {
  const input = document.querySelector('input[type="file"]');
  if (input === null) return;
  fireEvent.change(input, { target: { files: [file] } });
};

describe("GarmentForm istanbul coverage", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
    mockRouter.push.mockClear();
    mockUpload.mockClear();
    mockResetUpload.mockClear();
    mockUploadState.value = { status: "idle" };
    mockExtractColors.mockClear();
    mockExtractionState.value = { status: "idle" };
    mockExtractColors.mockResolvedValue({ presetColors: [] });
    mockUpload.mockResolvedValue("https://example.com/uploaded.png");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("新規作成で画像アップロード失敗時は imageUrl が undefined になる", async () => {
    const user = userEvent.setup();
    mockUpload.mockRejectedValue(new Error("upload failed"));

    await renderWithProviders(<GarmentForm />);

    fireFileSelect(createPngFile());
    await user.type(screen.getByLabelText("名前"), "失敗ケース");
    await user.click(
      await screen.findByRole(
        "button",
        { name: "登録する" },
        { timeout: TIMEOUT_MS },
      ),
    );

    const { getDb } = await import("@/lib/db/dexie");
    const db = getDb();
    await waitFor(
      async () => {
        const garments = await db.garments.toArray();
        expect(garments.length).toBe(1);
        expect(garments[0]?.imageUrl).toBeUndefined();
      },
      { timeout: TIMEOUT_MS },
    );
  });

  it("色抽出失敗時に colors が空のままになる", async () => {
    mockExtractColors.mockRejectedValue(new Error("extract failed"));
    const user = userEvent.setup();
    await renderWithProviders(<GarmentForm />);

    fireFileSelect(createPngFile());

    await waitFor(
      () => {
        expect(mockExtractColors).toHaveBeenCalled();
      },
      { timeout: TIMEOUT_MS },
    );

    await user.type(screen.getByLabelText("名前"), "色抽出失敗");
    await user.click(
      await screen.findByRole(
        "button",
        { name: "登録する" },
        { timeout: TIMEOUT_MS },
      ),
    );

    const { getDb } = await import("@/lib/db/dexie");
    const db = getDb();
    await waitFor(
      async () => {
        const garments = await db.garments.toArray();
        expect(garments[0]?.colors).toEqual([]);
      },
      { timeout: TIMEOUT_MS },
    );
  });

  it("既存 garment の locationId なしを編集すると locationId は undefined のまま保たれる", async () => {
    const user = userEvent.setup();
    const existing = createTestGarment({
      id: "garment-no-loc",
      locationId: undefined,
      imageUrl: undefined,
    });

    await renderWithProviders(<GarmentForm garment={existing} />);

    const nameInput = screen.getByLabelText("名前");
    await user.clear(nameInput);
    await user.type(nameInput, "場所なし更新");
    await user.click(
      await screen.findByRole(
        "button",
        { name: "更新する" },
        { timeout: TIMEOUT_MS },
      ),
    );

    const { getDb } = await import("@/lib/db/dexie");
    const db = getDb();
    await waitFor(
      async () => {
        const garments = await db.garments.toArray();
        expect(garments[0]?.locationId).toBeUndefined();
        expect(garments[0]?.name).toBe("場所なし更新");
      },
      { timeout: TIMEOUT_MS },
    );
  });

  it("タグの追加 / 重複スキップ / 削除が動作する", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<GarmentForm />);

    const tagInput = screen.getByPlaceholderText("タグを入力...");
    await user.type(tagInput, "ピンク{Enter}");
    expect(await screen.findByText("ピンク")).toBeInTheDocument();

    await user.type(tagInput, "ピンク{Enter}");
    expect(screen.getAllByText("ピンク").length).toBe(1);

    await user.type(tagInput, "リボン{Enter}");
    expect(await screen.findByText("リボン")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "ピンクを削除" }));
    await waitFor(
      () => {
        expect(screen.queryByText("ピンク")).not.toBeInTheDocument();
      },
      { timeout: TIMEOUT_MS },
    );

    await user.type(screen.getByLabelText("名前"), "タグ付け服");
    await user.click(
      await screen.findByRole(
        "button",
        { name: "登録する" },
        { timeout: TIMEOUT_MS },
      ),
    );

    const { getDb } = await import("@/lib/db/dexie");
    const db = getDb();
    await waitFor(
      async () => {
        const garments = await db.garments.toArray();
        expect(garments[0]?.tags).toEqual(["リボン"]);
      },
      { timeout: TIMEOUT_MS },
    );
  });

  it("brand / メモ / セット内容を入力すると保存される", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<GarmentForm />);

    await user.type(screen.getByLabelText("名前"), "詳細あり");
    await user.type(screen.getByLabelText("ブランド/メーカー"), "ボークス");
    await user.type(screen.getByLabelText("メモ"), "伸縮性あり");
    await user.type(screen.getByLabelText("セット内容"), "ブラウス、スカート");

    await user.click(
      await screen.findByRole(
        "button",
        { name: "登録する" },
        { timeout: TIMEOUT_MS },
      ),
    );

    const { getDb } = await import("@/lib/db/dexie");
    const db = getDb();
    await waitFor(
      async () => {
        const garments = await db.garments.toArray();
        expect(garments[0]?.brand).toBe("ボークス");
        expect(garments[0]?.description).toBe("伸縮性あり");
        expect(garments[0]?.setContents).toBe("ブラウス、スカート");
      },
      { timeout: TIMEOUT_MS },
    );
  });

  it("brand / メモ / セット内容が空白のみの場合は undefined として保存される", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<GarmentForm />);

    await user.type(screen.getByLabelText("名前"), "空白のみ");
    await user.type(screen.getByLabelText("ブランド/メーカー"), "   ");
    await user.type(screen.getByLabelText("メモ"), "   ");
    await user.type(screen.getByLabelText("セット内容"), "   ");

    await user.click(
      await screen.findByRole(
        "button",
        { name: "登録する" },
        { timeout: TIMEOUT_MS },
      ),
    );

    const { getDb } = await import("@/lib/db/dexie");
    const db = getDb();
    await waitFor(
      async () => {
        const garments = await db.garments.toArray();
        expect(garments[0]?.brand).toBeUndefined();
        expect(garments[0]?.description).toBeUndefined();
        expect(garments[0]?.setContents).toBeUndefined();
      },
      { timeout: TIMEOUT_MS },
    );
  });

  it("既存 garment の brand / description / setContents が初期値として表示される", async () => {
    const existing = createTestGarment({
      id: "garment-with-fields",
      brand: "アゾン",
      description: "厚手生地",
      setContents: "トップス、ボトムス",
    });

    await renderWithProviders(<GarmentForm garment={existing} />);

    expect(
      await screen.findByDisplayValue("アゾン", undefined, {
        timeout: TIMEOUT_MS,
      }),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("厚手生地")).toBeInTheDocument();
    expect(screen.getByDisplayValue("トップス、ボトムス")).toBeInTheDocument();
  });

  it("ドールサイズの追加と除外（最後の1件は除外不可）が動作する", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<GarmentForm />);

    const msdButton = screen.getByRole("button", { name: /^MSD/ });
    await user.click(msdButton);

    const sdButton = screen.getByRole("button", { name: /^SD \(/ });
    await user.click(sdButton);
    await user.click(sdButton);

    await user.type(screen.getByLabelText("名前"), "サイズ複数");
    await user.click(
      await screen.findByRole(
        "button",
        { name: "登録する" },
        { timeout: TIMEOUT_MS },
      ),
    );

    const { getDb } = await import("@/lib/db/dexie");
    const db = getDb();
    await waitFor(
      async () => {
        const garments = await db.garments.toArray();
        expect(garments[0]?.dollSizes.length).toBeGreaterThanOrEqual(1);
        expect(garments[0]?.dollSizes).toContain("MSD");
      },
      { timeout: TIMEOUT_MS },
    );
  });

  it("colors が既に存在する場合は画像選択時に色抽出を呼ばない", async () => {
    const existing = createTestGarment({
      id: "garment-with-colors",
      colors: ["hsl(0, 70%, 55%)"],
    });
    await renderWithProviders(<GarmentForm garment={existing} />);

    fireFileSelect(createPngFile());

    await waitFor(
      () => {
        expect(mockExtractColors).not.toHaveBeenCalled();
      },
      { timeout: TIMEOUT_MS },
    );
  });

  it("画像を 2 度選択しても 2 度目もハンドラが反応する (URL.revokeObjectURL 分岐)", async () => {
    await renderWithProviders(<GarmentForm />);

    fireFileSelect(createPngFile());
    await waitFor(
      () => {
        expect(mockExtractColors).toHaveBeenCalledTimes(1);
      },
      { timeout: TIMEOUT_MS },
    );

    mockExtractColors.mockClear();
    mockResetUpload.mockClear();
    fireFileSelect(createPngFile("test2.png"));
    await waitFor(
      () => {
        expect(mockResetUpload).toHaveBeenCalledTimes(1);
      },
      { timeout: TIMEOUT_MS },
    );
  });
});
