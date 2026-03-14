import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import type { Garment } from "@/types";
import { MS_PER_DAY } from "@/lib/constants";
import { createTestGarment, FIXED_NOW } from "@/test/factories";
import { renderWithProviders } from "@/test/testUtils";
import GarmentsPage from "./page";

const mockRouter = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => new URLSearchParams(),
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

const mockGarments = vi.hoisted(() => ({
  value: [] as Garment[],
}));

vi.mock("@/stores/garmentAtoms", async () => {
  const { atom } = await import("jotai");
  return {
    garmentsAtom: atom(() => mockGarments.value),
  };
});

const findButtonByText = (text: string) => {
  const elements = screen.getAllByText(text);
  const button = elements.find((el) => el.tagName.toLowerCase() === "button");
  if (button === undefined) {
    throw new Error(`No button found with text: ${text}`);
  }
  return button;
};

describe("GarmentsPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
    mockGarments.value = [];
    mockRouter.push.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("服がない場合に空状態を表示する", () => {
    renderWithProviders(<GarmentsPage />);

    expect(screen.getByText("まだ服がありません")).toBeInTheDocument();
    expect(screen.getByText("服を登録")).toBeInTheDocument();
  });

  it("空状態のCTAクリックで新規登録ページに遷移する", () => {
    renderWithProviders(<GarmentsPage />);

    fireEvent.click(screen.getByText("服を登録"));
    expect(mockRouter.push).toHaveBeenCalledWith("/garments/new");
  });

  it("服一覧を表示する", () => {
    mockGarments.value = [
      createTestGarment({ id: "g-1", name: "白いドレス" }),
      createTestGarment({ id: "g-2", name: "黒いコート" }),
    ];
    renderWithProviders(<GarmentsPage />);

    expect(screen.getByText("白いドレス")).toBeInTheDocument();
    expect(screen.getByText("黒いコート")).toBeInTheDocument();
  });

  it("名前で検索できる", () => {
    mockGarments.value = [
      createTestGarment({ id: "g-1", name: "白いドレス" }),
      createTestGarment({ id: "g-2", name: "黒いコート", category: "outer" }),
    ];
    renderWithProviders(<GarmentsPage />);

    fireEvent.change(screen.getByPlaceholderText("名前やタグで検索..."), {
      target: { value: "ドレス" },
    });

    expect(screen.getByText("白いドレス")).toBeInTheDocument();
    expect(screen.queryByText("黒いコート")).not.toBeInTheDocument();
  });

  it("タグで検索できる", () => {
    mockGarments.value = [
      createTestGarment({
        id: "g-1",
        name: "白いドレス",
        tags: ["フォーマル"],
      }),
      createTestGarment({ id: "g-2", name: "黒いコート", category: "outer" }),
    ];
    renderWithProviders(<GarmentsPage />);

    fireEvent.change(screen.getByPlaceholderText("名前やタグで検索..."), {
      target: { value: "フォーマル" },
    });

    expect(screen.getByText("白いドレス")).toBeInTheDocument();
    expect(screen.queryByText("黒いコート")).not.toBeInTheDocument();
  });

  it("カテゴリでフィルタできる", () => {
    mockGarments.value = [
      createTestGarment({ id: "g-1", name: "白いドレス", category: "dress" }),
      createTestGarment({ id: "g-2", name: "黒いコート", category: "outer" }),
    ];
    renderWithProviders(<GarmentsPage />);

    fireEvent.click(findButtonByText("ドレス"));

    expect(screen.getByText("白いドレス")).toBeInTheDocument();
    expect(screen.queryByText("黒いコート")).not.toBeInTheDocument();
  });

  it("信頼度でフィルタできる", () => {
    mockGarments.value = [
      createTestGarment({
        id: "g-1",
        name: "確定の服",
        lastScannedAt: FIXED_NOW,
      }),
      createTestGarment({
        id: "g-2",
        name: "要確認の服",
        lastScannedAt: FIXED_NOW - 20 * MS_PER_DAY,
      }),
    ];
    renderWithProviders(<GarmentsPage />);

    fireEvent.click(findButtonByText("要確認"));

    expect(screen.queryByText("確定の服")).not.toBeInTheDocument();
    expect(screen.getByText("要確認の服")).toBeInTheDocument();
  });

  it("ソート順を切り替えられる", () => {
    mockGarments.value = [
      createTestGarment({
        id: "g-1",
        name: "古い服",
        createdAt: FIXED_NOW - 10 * MS_PER_DAY,
      }),
      createTestGarment({
        id: "g-2",
        name: "新しい服",
        createdAt: FIXED_NOW,
      }),
    ];
    renderWithProviders(<GarmentsPage />);

    fireEvent.change(screen.getByLabelText("並び替え"), {
      target: { value: "oldest" },
    });

    const garmentNames = screen
      .getAllByText(/^(?:古い服|新しい服)$/)
      .map((el) => el.textContent);
    expect(garmentNames[0]).toBe("古い服");
    expect(garmentNames[1]).toBe("新しい服");
  });

  it("フィルタと検索を組み合わせられる", () => {
    mockGarments.value = [
      createTestGarment({
        id: "g-1",
        name: "白いドレス",
        category: "dress",
      }),
      createTestGarment({
        id: "g-2",
        name: "黒いドレス",
        category: "dress",
      }),
      createTestGarment({
        id: "g-3",
        name: "白いコート",
        category: "outer",
      }),
    ];
    renderWithProviders(<GarmentsPage />);

    fireEvent.click(findButtonByText("ドレス"));
    fireEvent.change(screen.getByPlaceholderText("名前やタグで検索..."), {
      target: { value: "白い" },
    });

    expect(screen.getByText("白いドレス")).toBeInTheDocument();
    expect(screen.queryByText("黒いドレス")).not.toBeInTheDocument();
    expect(screen.queryByText("白いコート")).not.toBeInTheDocument();
  });

  it("フィルタ結果が空の場合にメッセージを表示する", () => {
    mockGarments.value = [
      createTestGarment({ id: "g-1", name: "白いドレス", category: "dress" }),
    ];
    renderWithProviders(<GarmentsPage />);

    fireEvent.click(screen.getByText("アウター"));

    expect(screen.getByText("一致する服が見つかりません")).toBeInTheDocument();
  });

  it("グリッド/リスト表示を切り替えられる", () => {
    mockGarments.value = [createTestGarment({ id: "g-1", name: "白いドレス" })];
    renderWithProviders(<GarmentsPage />);

    const gridButton = screen.getByLabelText("グリッド表示");
    const listButton = screen.getByLabelText("リスト表示");

    expect(gridButton).toHaveAttribute("aria-pressed", "true");
    expect(listButton).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(listButton);

    expect(gridButton).toHaveAttribute("aria-pressed", "false");
    expect(listButton).toHaveAttribute("aria-pressed", "true");
  });
});
