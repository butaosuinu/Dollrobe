import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FIXED_NOW } from "@/test/mocks/db";
import { renderWithProviders } from "@/test/testUtils";
import DollForm from "./DollForm";

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

describe("DollForm", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
    mockRouter.push.mockClear();
    mockUpload.mockClear();
    mockResetUpload.mockClear();
    mockUploadState.value = { status: "idle" };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("フォームの各フィールドが表示される", async () => {
    await renderWithProviders(<DollForm />);

    expect(screen.getByLabelText("名前")).toBeInTheDocument();
    expect(screen.getByLabelText("ヘッド型番")).toBeInTheDocument();
    expect(screen.getByLabelText("ボディサイズ")).toBeInTheDocument();
    expect(screen.getByLabelText("メモ")).toBeInTheDocument();
    expect(screen.getByText("写真を追加")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "登録する" }),
    ).toBeInTheDocument();
  });

  it("名前が空の場合は登録ボタンがdisabledになる", async () => {
    await renderWithProviders(<DollForm />);

    expect(screen.getByRole("button", { name: "登録する" })).toBeDisabled();
  });

  it("名前を入力すると登録ボタンがenabledになる", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<DollForm />);

    await user.type(screen.getByLabelText("名前"), "リナ");

    expect(screen.getByRole("button", { name: "登録する" })).toBeEnabled();
  });

  it("登録フロー: 名前入力→送信→Dexieに保存+ナビゲーション", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<DollForm />);

    await user.type(screen.getByLabelText("名前"), "リナ");
    await user.click(screen.getByRole("button", { name: "登録する" }));

    const { db } = await import("@/lib/db/dexie");
    await waitFor(async () => {
      const dolls = await db.dolls.toArray();
      expect(dolls.length).toBe(1);
      expect(dolls[0]?.name).toBe("リナ");
      expect(dolls[0]?.id).toBe("test-cuid");
      expect(dolls[0]?.bodySize).toBe("SD");
    });
    expect(mockRouter.push).toHaveBeenCalledWith("/dolls");
  });

  it("アップロード中はボタンが disabled + テキスト変更", async () => {
    mockUploadState.value = { status: "uploading" };
    await renderWithProviders(<DollForm />);

    expect(
      screen.getByRole("button", { name: "アップロード中..." }),
    ).toBeDisabled();
  });
});
