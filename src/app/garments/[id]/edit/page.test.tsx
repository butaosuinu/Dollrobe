import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Garment } from "@/types";
import { createTestGarment } from "@/test/factories";
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

const mockGarments = vi.hoisted((): { value: Garment[] } => ({
  value: [],
}));

const mockUpdateGarment = vi.hoisted(() => vi.fn());
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
    garmentsAtom: atom(() => mockGarments.value),
    addGarmentAtom: atom(
      undefined,
      (_get: unknown, _set: unknown, garment: unknown) => {
        mockAddGarment(garment);
      },
    ),
    updateGarmentAtom: atom(
      undefined,
      (_get: unknown, _set: unknown, garment: unknown) => {
        mockUpdateGarment(garment);
      },
    ),
  };
});

vi.mock("@paralleldrive/cuid2", () => ({
  createId: () => "test-cuid",
}));

describe("GarmentEditPage", () => {
  beforeEach(() => {
    mockRouter.push.mockClear();
    mockRouter.back.mockClear();
    mockUpdateGarment.mockClear();
    mockAddGarment.mockClear();
    mockUpload.mockClear();
    mockResetUpload.mockClear();
    mockUploadState.value = { status: "idle" };
    mockParams.value = { id: "garment-1" };
    mockGarments.value = [];
  });

  it("ページタイトル「服を編集」が表示される", () => {
    mockGarments.value = [createTestGarment({ id: "garment-1" })];
    renderWithProviders(<GarmentEditPage />);

    expect(
      screen.getByRole("heading", { name: "服を編集" }),
    ).toBeInTheDocument();
  });

  it("既存の服データがフォームに初期値として入力されている", () => {
    mockGarments.value = [
      createTestGarment({
        id: "garment-1",
        name: "白いドレス",
        category: "dress",
        dollSize: "MSD",
        brand: "ボークス",
      }),
    ];
    renderWithProviders(<GarmentEditPage />);

    expect(screen.getByLabelText("名前")).toHaveValue("白いドレス");
    expect(screen.getByLabelText("カテゴリ")).toHaveValue("dress");
    expect(screen.getByLabelText("ドールサイズ")).toHaveValue("MSD");
    expect(screen.getByLabelText("ブランド/メーカー")).toHaveValue("ボークス");
  });

  it("更新ボタンが表示される（登録するではなく）", () => {
    mockGarments.value = [createTestGarment({ id: "garment-1" })];
    renderWithProviders(<GarmentEditPage />);

    expect(
      screen.getByRole("button", { name: "更新する" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "登録する" }),
    ).not.toBeInTheDocument();
  });

  it("存在しない服の場合にメッセージを表示する", () => {
    mockParams.value = { id: "non-existent" };
    mockGarments.value = [];
    renderWithProviders(<GarmentEditPage />);

    expect(screen.getByText("服が見つかりません")).toBeInTheDocument();
    expect(screen.getByText("一覧に戻る")).toBeInTheDocument();
  });

  it("「一覧に戻る」クリックで /garments にナビゲーションする", async () => {
    const user = userEvent.setup();
    mockParams.value = { id: "non-existent" };
    mockGarments.value = [];
    renderWithProviders(<GarmentEditPage />);

    await user.click(screen.getByText("一覧に戻る"));

    expect(mockRouter.push).toHaveBeenCalledWith("/garments");
  });

  it("戻るボタンで router.back() が呼ばれる", async () => {
    const user = userEvent.setup();
    mockGarments.value = [createTestGarment({ id: "garment-1" })];
    renderWithProviders(<GarmentEditPage />);

    const buttons = screen.getAllByRole("button");
    await user.click(buttons[0]);

    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });

  it("名前を変更して送信すると updateGarmentAtom が呼ばれる", async () => {
    const user = userEvent.setup();
    mockGarments.value = [
      createTestGarment({ id: "garment-1", name: "白いドレス" }),
    ];
    renderWithProviders(<GarmentEditPage />);

    const nameInput = screen.getByLabelText("名前");
    await user.clear(nameInput);
    await user.type(nameInput, "赤いドレス");
    await user.click(screen.getByRole("button", { name: "更新する" }));

    expect(mockUpdateGarment).toHaveBeenCalledTimes(1);
    expect(mockUpdateGarment).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "garment-1",
        name: "赤いドレス",
      }),
    );
  });

  it("送信後に詳細ページにナビゲーションする", async () => {
    const user = userEvent.setup();
    mockGarments.value = [
      createTestGarment({ id: "garment-1", name: "白いドレス" }),
    ];
    renderWithProviders(<GarmentEditPage />);

    await user.click(screen.getByRole("button", { name: "更新する" }));

    expect(mockRouter.push).toHaveBeenCalledWith("/garments/garment-1");
  });

  it("カテゴリを変更して送信すると反映される", async () => {
    const user = userEvent.setup();
    mockGarments.value = [
      createTestGarment({ id: "garment-1", category: "dress" }),
    ];
    renderWithProviders(<GarmentEditPage />);

    await user.selectOptions(screen.getByLabelText("カテゴリ"), "tops");
    await user.click(screen.getByRole("button", { name: "更新する" }));

    expect(mockUpdateGarment).toHaveBeenCalledWith(
      expect.objectContaining({ category: "tops" }),
    );
  });

  it("編集時に元の id, userId, status, locationId が保持される", async () => {
    const user = userEvent.setup();
    const garment = createTestGarment({
      id: "garment-1",
      userId: "user-1",
      status: "stored",
      locationId: "loc-1",
    });
    mockGarments.value = [garment];
    renderWithProviders(<GarmentEditPage />);

    await user.click(screen.getByRole("button", { name: "更新する" }));

    expect(mockUpdateGarment).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "garment-1",
        userId: "user-1",
        status: "stored",
        locationId: "loc-1",
      }),
    );
  });

  it("addGarmentAtom は呼ばれない（updateGarmentAtom のみ）", async () => {
    const user = userEvent.setup();
    mockGarments.value = [
      createTestGarment({ id: "garment-1", name: "白いドレス" }),
    ];
    renderWithProviders(<GarmentEditPage />);

    await user.click(screen.getByRole("button", { name: "更新する" }));

    expect(mockAddGarment).not.toHaveBeenCalled();
    expect(mockUpdateGarment).toHaveBeenCalledTimes(1);
  });

  it("名前を空にすると更新ボタンがdisabledになる", async () => {
    const user = userEvent.setup();
    mockGarments.value = [
      createTestGarment({ id: "garment-1", name: "白いドレス" }),
    ];
    renderWithProviders(<GarmentEditPage />);

    await user.clear(screen.getByLabelText("名前"));

    expect(screen.getByRole("button", { name: "更新する" })).toBeDisabled();
  });

  it("アップロード中はボタンが disabled になる", () => {
    mockUploadState.value = { status: "uploading" };
    mockGarments.value = [createTestGarment({ id: "garment-1" })];
    renderWithProviders(<GarmentEditPage />);

    expect(
      screen.getByRole("button", { name: "アップロード中..." }),
    ).toBeDisabled();
  });
});
