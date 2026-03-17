import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

const mockAddGarment = vi.hoisted(() => vi.fn());

const mockAuthState = vi.hoisted(() => ({
  value: {
    user: {
      id: "user-1",
      name: "テストユーザー",
      email: "test@example.com",
      image: undefined,
    },
    isAuthenticated: true,
  },
}));

vi.mock("@/stores/authAtoms", async () => {
  const { atom } = await import("jotai");
  return {
    authSessionAtom: atom(() => mockAuthState.value),
  };
});

vi.mock("@/stores/garmentAtoms", async () => {
  const { atom } = await import("jotai");
  return {
    garmentsAtom: atom(() => []),
    addGarmentAtom: atom(
      undefined,
      (_get: unknown, _set: unknown, garment: unknown) => {
        mockAddGarment(garment);
      },
    ),
  };
});

vi.mock("@paralleldrive/cuid2", () => ({
  createId: () => "test-cuid",
}));

describe("GarmentForm", () => {
  beforeEach(() => {
    mockRouter.push.mockClear();
    mockAddGarment.mockClear();
    mockUpload.mockClear();
    mockResetUpload.mockClear();
    mockUploadState.value = { status: "idle" };
  });

  it("フォームの各フィールドが表示される", () => {
    renderWithProviders(<GarmentForm />);

    expect(screen.getByLabelText("名前")).toBeInTheDocument();
    expect(screen.getByLabelText("カテゴリ")).toBeInTheDocument();
    expect(screen.getByLabelText("ドールサイズ")).toBeInTheDocument();
    expect(screen.getByLabelText("信頼度の減衰期間")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "登録する" }),
    ).toBeInTheDocument();
  });

  it("名前が空の場合は登録ボタンがdisabledになる", () => {
    renderWithProviders(<GarmentForm />);

    expect(screen.getByRole("button", { name: "登録する" })).toBeDisabled();
  });

  it("名前を入力すると登録ボタンがenabledになる", async () => {
    const user = userEvent.setup();
    renderWithProviders(<GarmentForm />);

    await user.type(screen.getByLabelText("名前"), "テストドレス");

    expect(screen.getByRole("button", { name: "登録する" })).toBeEnabled();
  });

  it("登録フロー: 名前入力→送信→atom呼出+ナビゲーション", async () => {
    const user = userEvent.setup();
    renderWithProviders(<GarmentForm />);

    await user.type(screen.getByLabelText("名前"), "新しいドレス");
    await user.click(screen.getByRole("button", { name: "登録する" }));

    expect(mockAddGarment).toHaveBeenCalledTimes(1);
    expect(mockAddGarment).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "新しいドレス",
        id: "test-cuid",
        userId: "user-1",
        category: "tops",
        dollSize: "SD",
        status: "stored",
      }),
    );
    expect(mockRouter.push).toHaveBeenCalledWith("/garments");
  });

  it("カテゴリを変更して登録すると反映される", async () => {
    const user = userEvent.setup();
    renderWithProviders(<GarmentForm />);

    await user.type(screen.getByLabelText("名前"), "テスト服");
    await user.selectOptions(screen.getByLabelText("カテゴリ"), "dress");
    await user.click(screen.getByRole("button", { name: "登録する" }));

    expect(mockAddGarment).toHaveBeenCalledWith(
      expect.objectContaining({ category: "dress" }),
    );
  });

  it("空白のみの名前ではdisabledのままになる", async () => {
    const user = userEvent.setup();
    renderWithProviders(<GarmentForm />);

    await user.type(screen.getByLabelText("名前"), "   ");

    expect(screen.getByRole("button", { name: "登録する" })).toBeDisabled();
  });

  it("画像選択エリアが表示される", () => {
    renderWithProviders(<GarmentForm />);

    expect(screen.getByText("写真を追加")).toBeInTheDocument();
  });

  it("アップロード中はボタンが disabled + テキスト変更", () => {
    mockUploadState.value = { status: "uploading" };
    renderWithProviders(<GarmentForm />);

    expect(
      screen.getByRole("button", { name: "アップロード中..." }),
    ).toBeDisabled();
  });

  it("圧縮中はボタンが disabled + テキスト変更", () => {
    mockUploadState.value = { status: "compressing" };
    renderWithProviders(<GarmentForm />);

    expect(
      screen.getByRole("button", { name: "アップロード中..." }),
    ).toBeDisabled();
  });
});
