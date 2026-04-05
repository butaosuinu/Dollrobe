import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FIXED_NOW } from "@/test/mocks/db";
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

describe("GarmentForm", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
    mockRouter.push.mockClear();
    mockUpload.mockClear();
    mockResetUpload.mockClear();
    mockUploadState.value = { status: "idle" };
    mockExtractColors.mockClear();
    mockExtractionState.value = { status: "idle" };
    mockExtractColors.mockResolvedValue({ presetColors: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("フォームの各フィールドが表示される", async () => {
    await renderWithProviders(<GarmentForm />);

    expect(screen.getByLabelText("名前")).toBeInTheDocument();
    expect(screen.getByLabelText("カテゴリ")).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "ドールサイズ" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("信頼度の減衰期間")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "登録する" }),
    ).toBeInTheDocument();
  });

  it("名前が空の場合は登録ボタンがdisabledになる", async () => {
    await renderWithProviders(<GarmentForm />);

    expect(screen.getByRole("button", { name: "登録する" })).toBeDisabled();
  });

  it("名前を入力すると登録ボタンがenabledになる", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<GarmentForm />);

    await user.type(screen.getByLabelText("名前"), "テストドレス");

    expect(screen.getByRole("button", { name: "登録する" })).toBeEnabled();
  });

  it("登録フロー: 名前入力→送信→Dexieに保存+ナビゲーション", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<GarmentForm />);

    await user.type(screen.getByLabelText("名前"), "新しいドレス");
    await user.click(screen.getByRole("button", { name: "登録する" }));

    const { getDb } = await import("@/lib/db/dexie");
    const db = getDb();
    await waitFor(async () => {
      const garments = await db.garments.toArray();
      expect(garments.length).toBe(1);
      expect(garments[0]?.name).toBe("新しいドレス");
      expect(garments[0]?.id).toBe("test-cuid");
      expect(garments[0]?.userId).toBe("user-1");
      expect(garments[0]?.category).toBe("tops");
      expect(garments[0]?.dollSizes).toEqual(["SD"]);
      expect(garments[0]?.status).toBe("stored");
    });
    expect(mockRouter.push).toHaveBeenCalledWith("/garments");
  });

  it("カテゴリを変更して登録すると反映される", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<GarmentForm />);

    await user.type(screen.getByLabelText("名前"), "テスト服");
    await user.selectOptions(screen.getByLabelText("カテゴリ"), "dress");
    await user.click(screen.getByRole("button", { name: "登録する" }));

    const { getDb } = await import("@/lib/db/dexie");
    const db = getDb();
    await waitFor(async () => {
      const garments = await db.garments.toArray();
      expect(garments[0]?.category).toBe("dress");
    });
  });

  it("空白のみの名前ではdisabledのままになる", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<GarmentForm />);

    await user.type(screen.getByLabelText("名前"), "   ");

    expect(screen.getByRole("button", { name: "登録する" })).toBeDisabled();
  });

  it("画像選択エリアが表示される", async () => {
    await renderWithProviders(<GarmentForm />);

    expect(screen.getByText("写真を追加")).toBeInTheDocument();
  });

  it("アップロード中はボタンが disabled + テキスト変更", async () => {
    mockUploadState.value = { status: "uploading" };
    await renderWithProviders(<GarmentForm />);

    expect(
      screen.getByRole("button", { name: "アップロード中..." }),
    ).toBeDisabled();
  });

  it("圧縮中はボタンが disabled + テキスト変更", async () => {
    mockUploadState.value = { status: "compressing" };
    await renderWithProviders(<GarmentForm />);

    expect(
      screen.getByRole("button", { name: "アップロード中..." }),
    ).toBeDisabled();
  });

  it("色分析中はローディング表示される", async () => {
    mockExtractionState.value = { status: "loading" };
    await renderWithProviders(<GarmentForm />);

    expect(screen.getByText("色を分析中...")).toBeInTheDocument();
  });

  it("色分析が完了するとローディングが消える", async () => {
    mockExtractionState.value = {
      status: "done",
      colors: ["hsl(0, 70%, 55%)"],
    };
    await renderWithProviders(<GarmentForm />);

    expect(screen.queryByText("色を分析中...")).not.toBeInTheDocument();
  });

  it("画像選択時に色が空なら色抽出が呼ばれる", async () => {
    mockExtractColors.mockResolvedValue({
      presetColors: ["hsl(0, 70%, 55%)"],
    });
    await renderWithProviders(<GarmentForm />);

    const file = new File(["dummy"], "test.png", { type: "image/png" });
    const input = document.querySelector('input[type="file"]');
    if (input === null) return;
    fireEvent.change(input, { target: { files: [file] } });

    expect(mockExtractColors).toHaveBeenCalledWith({ file });
  });

  it("色抽出失敗時もフォームは正常に動作する", async () => {
    const user = userEvent.setup();
    mockExtractColors.mockResolvedValue({ presetColors: [] });
    await renderWithProviders(<GarmentForm />);

    const file = new File(["dummy"], "test.png", { type: "image/png" });
    const input = document.querySelector('input[type="file"]');
    if (input === null) return;
    fireEvent.change(input, { target: { files: [file] } });

    await user.type(screen.getByLabelText("名前"), "テスト服");
    expect(screen.getByRole("button", { name: "登録する" })).toBeEnabled();
  });
});
