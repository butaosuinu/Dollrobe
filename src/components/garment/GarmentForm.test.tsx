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
        dollSize: "1/3",
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
});
