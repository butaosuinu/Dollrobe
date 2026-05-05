import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FIXED_NOW } from "@/test/mocks/db";
import { renderWithProviders } from "@/test/testUtils";
import { setupNextNavigation } from "@/test/mocks/modules/nextNavigation";
import { setupCuid2 } from "@/test/mocks/modules/cuid2";
import { setupUseImageUpload } from "@/test/mocks/modules/useImageUpload";
import { setupUseBrandSuggestions } from "@/test/mocks/modules/useBrandSuggestions";
import { setupUseColorExtraction } from "@/test/mocks/modules/useColorExtraction";
import GarmentForm from "./GarmentForm";

const navHandle = setupNextNavigation();

const uploadHandle: {
  current: ReturnType<typeof setupUseImageUpload>;
} = {
  current: setupUseImageUpload(),
};

const colorHandle: {
  current: ReturnType<typeof setupUseColorExtraction>;
} = {
  current: setupUseColorExtraction(),
};

describe("GarmentForm", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
    setupNextNavigation();
    setupCuid2({ id: "test-cuid" });
    uploadHandle.current = setupUseImageUpload();
    setupUseBrandSuggestions([]);
    colorHandle.current = setupUseColorExtraction();
    colorHandle.current.extractColors.mockResolvedValue({ presetColors: [] });
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
    expect(navHandle.router.push).toHaveBeenCalledWith("/garments");
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
    uploadHandle.current.setUploadState({ status: "uploading" });
    await renderWithProviders(<GarmentForm />);

    expect(
      screen.getByRole("button", { name: "アップロード中..." }),
    ).toBeDisabled();
  });

  it("圧縮中はボタンが disabled + テキスト変更", async () => {
    uploadHandle.current.setUploadState({ status: "compressing" });
    await renderWithProviders(<GarmentForm />);

    expect(
      screen.getByRole("button", { name: "アップロード中..." }),
    ).toBeDisabled();
  });

  it("色分析中はローディング表示される", async () => {
    colorHandle.current.setExtractionState({ status: "loading" });
    await renderWithProviders(<GarmentForm />);

    expect(screen.getByText("色を分析中...")).toBeInTheDocument();
  });

  it("色分析が完了するとローディングが消える", async () => {
    colorHandle.current.setExtractionState({
      status: "done",
      colors: ["hsl(0, 70%, 55%)"],
    });
    await renderWithProviders(<GarmentForm />);

    expect(screen.queryByText("色を分析中...")).not.toBeInTheDocument();
  });

  it("画像選択時に色が空なら色抽出が呼ばれる", async () => {
    colorHandle.current.extractColors.mockResolvedValue({
      presetColors: ["hsl(0, 70%, 55%)"],
    });
    await renderWithProviders(<GarmentForm />);

    const file = new File(["dummy"], "test.png", { type: "image/png" });
    const input = document.querySelector('input[type="file"]');
    if (input === null) return;
    fireEvent.change(input, { target: { files: [file] } });

    expect(colorHandle.current.extractColors).toHaveBeenCalledWith({ file });
  });

  it("色抽出失敗時もフォームは正常に動作する", async () => {
    const user = userEvent.setup();
    colorHandle.current.extractColors.mockResolvedValue({ presetColors: [] });
    await renderWithProviders(<GarmentForm />);

    const file = new File(["dummy"], "test.png", { type: "image/png" });
    const input = document.querySelector('input[type="file"]');
    if (input === null) return;
    fireEvent.change(input, { target: { files: [file] } });

    await user.type(screen.getByLabelText("名前"), "テスト服");
    expect(screen.getByRole("button", { name: "登録する" })).toBeEnabled();
  });
});
