import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { MS_PER_DAY } from "@/lib/constants";
import { testDb, FIXED_NOW } from "@/test/mocks/db";
import { seedDbFromTestDb } from "@/test/helpers/seedDb";
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

describe("GarmentsPage", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
    mockRouter.push.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("服がない場合に空状態を表示する", async () => {
    await renderWithProviders(<GarmentsPage />);

    expect(await screen.findByText("まだ服がありません")).toBeInTheDocument();
    expect(screen.getByText("服を登録")).toBeInTheDocument();
  });

  it("空状態のCTAクリックで新規登録ページに遷移する", async () => {
    await renderWithProviders(<GarmentsPage />);

    fireEvent.click(await screen.findByText("服を登録"));
    expect(mockRouter.push).toHaveBeenCalledWith("/garments/new");
  });

  it("服一覧を表示する", async () => {
    testDb.garment.create({ id: "g-1", name: "白いドレス" });
    testDb.garment.create({ id: "g-2", name: "黒いコート" });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentsPage />);

    expect(screen.getByText("白いドレス")).toBeInTheDocument();
    expect(screen.getByText("黒いコート")).toBeInTheDocument();
  });

  it("名前で検索できる", async () => {
    testDb.garment.create({ id: "g-1", name: "白いドレス" });
    testDb.garment.create({
      id: "g-2",
      name: "黒いコート",
      category: "outer",
    });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentsPage />);

    fireEvent.change(screen.getByPlaceholderText("名前やタグで検索..."), {
      target: { value: "ドレス" },
    });

    expect(screen.getByText("白いドレス")).toBeInTheDocument();
    expect(screen.queryByText("黒いコート")).not.toBeInTheDocument();
  });

  it("タグで検索できる", async () => {
    testDb.garment.create({
      id: "g-1",
      name: "白いドレス",
      tags: ["フォーマル"],
    });
    testDb.garment.create({
      id: "g-2",
      name: "黒いコート",
      category: "outer",
    });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentsPage />);

    fireEvent.change(screen.getByPlaceholderText("名前やタグで検索..."), {
      target: { value: "フォーマル" },
    });

    expect(screen.getByText("白いドレス")).toBeInTheDocument();
    expect(screen.queryByText("黒いコート")).not.toBeInTheDocument();
  });

  it("カテゴリでフィルタできる", async () => {
    testDb.garment.create({ id: "g-1", name: "白いドレス", category: "dress" });
    testDb.garment.create({ id: "g-2", name: "黒いコート", category: "outer" });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentsPage />);

    fireEvent.click(screen.getByRole("button", { name: "ドレス" }));

    expect(screen.getByText("白いドレス")).toBeInTheDocument();
    expect(screen.queryByText("黒いコート")).not.toBeInTheDocument();
  });

  it("信頼度でフィルタできる", async () => {
    testDb.garment.create({
      id: "g-1",
      name: "確定の服",
      lastScannedAt: FIXED_NOW,
    });
    testDb.garment.create({
      id: "g-2",
      name: "要確認の服",
      lastScannedAt: FIXED_NOW - 20 * MS_PER_DAY,
    });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentsPage />);

    fireEvent.click(screen.getByRole("button", { name: "要確認" }));

    expect(screen.queryByText("確定の服")).not.toBeInTheDocument();
    expect(screen.getByText("要確認の服")).toBeInTheDocument();
  });

  it("ソート順を切り替えられる", async () => {
    testDb.garment.create({
      id: "g-1",
      name: "古い服",
      createdAt: FIXED_NOW - 10 * MS_PER_DAY,
    });
    testDb.garment.create({
      id: "g-2",
      name: "新しい服",
      createdAt: FIXED_NOW,
    });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentsPage />);

    fireEvent.change(screen.getByLabelText("並び替え"), {
      target: { value: "oldest" },
    });

    const garmentNames = screen
      .getAllByText(/^(?:古い服|新しい服)$/)
      .map((el) => el.textContent);
    expect(garmentNames[0]).toBe("古い服");
    expect(garmentNames[1]).toBe("新しい服");
  });

  it("フィルタと検索を組み合わせられる", async () => {
    testDb.garment.create({
      id: "g-1",
      name: "白いドレス",
      category: "dress",
    });
    testDb.garment.create({
      id: "g-2",
      name: "黒いドレス",
      category: "dress",
    });
    testDb.garment.create({
      id: "g-3",
      name: "白いコート",
      category: "outer",
    });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentsPage />);

    fireEvent.click(screen.getByRole("button", { name: "ドレス" }));
    fireEvent.change(screen.getByPlaceholderText("名前やタグで検索..."), {
      target: { value: "白い" },
    });

    expect(screen.getByText("白いドレス")).toBeInTheDocument();
    expect(screen.queryByText("黒いドレス")).not.toBeInTheDocument();
    expect(screen.queryByText("白いコート")).not.toBeInTheDocument();
  });

  it("フィルタ結果が空の場合にメッセージを表示する", async () => {
    testDb.garment.create({
      id: "g-1",
      name: "白いドレス",
      category: "dress",
    });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentsPage />);

    fireEvent.click(screen.getByText("アウター"));

    expect(screen.getByText("一致する服が見つかりません")).toBeInTheDocument();
  });

  it("グリッド/リスト表示を切り替えられる", async () => {
    testDb.garment.create({ id: "g-1", name: "白いドレス" });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentsPage />);

    const gridButton = screen.getByLabelText("グリッド表示");
    const listButton = screen.getByLabelText("リスト表示");

    expect(gridButton).toHaveAttribute("aria-pressed", "true");
    expect(listButton).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(listButton);

    expect(gridButton).toHaveAttribute("aria-pressed", "false");
    expect(listButton).toHaveAttribute("aria-pressed", "true");
  });
});
