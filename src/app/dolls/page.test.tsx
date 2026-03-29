import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MS_PER_DAY } from "@/lib/constants";
import { testDb, FIXED_NOW } from "@/test/mocks/db";
import { seedDbFromTestDb } from "@/test/helpers/seedDb";
import { renderWithProviders } from "@/test/testUtils";
import DollsPage from "./page";

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

const openFilterPanel = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: /フィルター/ }));
};

describe("DollsPage", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
    mockRouter.push.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ドールがない場合に空状態を表示する", async () => {
    await renderWithProviders(<DollsPage />);

    expect(await screen.findByText("まだドールがいません")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "ドールを登録" }),
    ).toBeInTheDocument();
  });

  it("空状態のCTAクリックで新規登録ページに遷移する", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<DollsPage />);

    await user.click(
      await screen.findByRole("button", { name: "ドールを登録" }),
    );
    expect(mockRouter.push).toHaveBeenCalledWith("/dolls/new");
  });

  it("ドール一覧を表示する", async () => {
    testDb.doll.create({ id: "d-1", name: "リナ", bodySize: "SD" });
    testDb.doll.create({
      id: "d-2",
      name: "ユキ",
      bodySize: "MSD",
      customizer: "スタジオ桜",
    });
    await seedDbFromTestDb();

    await renderWithProviders(<DollsPage />);

    expect(screen.getByText("リナ")).toBeInTheDocument();
    expect(screen.getByText("ユキ")).toBeInTheDocument();
  });

  it("アーカイブ済みドールは一覧に表示されない", async () => {
    testDb.doll.create({ id: "d-1", name: "リナ" });
    testDb.doll.create({
      id: "d-2",
      name: "アーカイブ済み",
      archivedAt: FIXED_NOW,
    });
    await seedDbFromTestDb();

    await renderWithProviders(<DollsPage />);

    expect(screen.getByText("リナ")).toBeInTheDocument();
    expect(screen.queryByText("アーカイブ済み")).not.toBeInTheDocument();
  });

  it("名前で検索できる", async () => {
    const user = userEvent.setup();
    testDb.doll.create({ id: "d-1", name: "リナ" });
    testDb.doll.create({ id: "d-2", name: "ユキ" });
    await seedDbFromTestDb();

    await renderWithProviders(<DollsPage />);

    await user.type(
      screen.getByPlaceholderText("名前やカスタマイザーで検索..."),
      "リナ",
    );

    expect(screen.getByText("リナ")).toBeInTheDocument();
    expect(screen.queryByText("ユキ")).not.toBeInTheDocument();
  });

  it("カスタマイザー名で検索できる", async () => {
    const user = userEvent.setup();
    testDb.doll.create({
      id: "d-1",
      name: "リナ",
      customizer: "スタジオ桜",
    });
    testDb.doll.create({
      id: "d-2",
      name: "ユキ",
      customizer: "工房月光",
    });
    await seedDbFromTestDb();

    await renderWithProviders(<DollsPage />);

    await user.type(
      screen.getByPlaceholderText("名前やカスタマイザーで検索..."),
      "桜",
    );

    expect(screen.getByText("リナ")).toBeInTheDocument();
    expect(screen.queryByText("ユキ")).not.toBeInTheDocument();
  });

  it("ヘッド型番で検索できる", async () => {
    const user = userEvent.setup();
    testDb.doll.create({
      id: "d-1",
      name: "リナ",
      headModel: "DDH-06",
    });
    testDb.doll.create({
      id: "d-2",
      name: "ユキ",
      headModel: "SDM-F49",
    });
    await seedDbFromTestDb();

    await renderWithProviders(<DollsPage />);

    await user.type(
      screen.getByPlaceholderText("名前やカスタマイザーで検索..."),
      "DDH",
    );

    expect(screen.getByText("リナ")).toBeInTheDocument();
    expect(screen.queryByText("ユキ")).not.toBeInTheDocument();
  });

  it("ボディサイズでフィルタできる", async () => {
    const user = userEvent.setup();
    testDb.doll.create({ id: "d-1", name: "リナ", bodySize: "SD" });
    testDb.doll.create({ id: "d-2", name: "ユキ", bodySize: "MSD" });
    await seedDbFromTestDb();

    await renderWithProviders(<DollsPage />);

    await user.click(screen.getByRole("button", { name: /^MSD/ }));

    expect(screen.queryByText("リナ")).not.toBeInTheDocument();
    expect(screen.getByText("ユキ")).toBeInTheDocument();
  });

  it("「すべて」を選択するとサイズフィルタが解除される", async () => {
    const user = userEvent.setup();
    testDb.doll.create({ id: "d-1", name: "リナ", bodySize: "SD" });
    testDb.doll.create({ id: "d-2", name: "ユキ", bodySize: "MSD" });
    await seedDbFromTestDb();

    await renderWithProviders(<DollsPage />);

    await user.click(screen.getByRole("button", { name: /^MSD/ }));
    expect(screen.queryByText("リナ")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "すべて" }));
    expect(screen.getByText("リナ")).toBeInTheDocument();
    expect(screen.getByText("ユキ")).toBeInTheDocument();
  });

  describe("フィルターパネル", () => {
    it("フィルターボタンをクリックするとカスタマイザーフィルターが表示される", async () => {
      const user = userEvent.setup();
      testDb.doll.create({
        id: "d-1",
        name: "リナ",
        customizer: "スタジオ桜",
      });
      await seedDbFromTestDb();

      await renderWithProviders(<DollsPage />);

      await openFilterPanel(user);

      expect(screen.getByLabelText("カスタマイザー")).toBeInTheDocument();
    });

    it("フィルターボタンを再クリックするとパネルが閉じる", async () => {
      const user = userEvent.setup();
      testDb.doll.create({
        id: "d-1",
        name: "リナ",
        customizer: "スタジオ桜",
      });
      await seedDbFromTestDb();

      await renderWithProviders(<DollsPage />);

      await openFilterPanel(user);
      expect(screen.getByLabelText("カスタマイザー")).toBeInTheDocument();

      await openFilterPanel(user);
      expect(screen.queryByLabelText("カスタマイザー")).not.toBeInTheDocument();
    });

    it("カスタマイザーで絞り込める", async () => {
      const user = userEvent.setup();
      testDb.doll.create({
        id: "d-1",
        name: "リナ",
        customizer: "スタジオ桜",
      });
      testDb.doll.create({
        id: "d-2",
        name: "ユキ",
        customizer: "工房月光",
      });
      await seedDbFromTestDb();

      await renderWithProviders(<DollsPage />);

      await openFilterPanel(user);
      await user.selectOptions(
        screen.getByLabelText("カスタマイザー"),
        "スタジオ桜",
      );

      expect(screen.getByText("リナ")).toBeInTheDocument();
      expect(screen.queryByText("ユキ")).not.toBeInTheDocument();
    });

    it("アクティブフィルター数がバッジで表示される", async () => {
      const user = userEvent.setup();
      testDb.doll.create({
        id: "d-1",
        name: "リナ",
        customizer: "スタジオ桜",
      });
      await seedDbFromTestDb();

      await renderWithProviders(<DollsPage />);

      await openFilterPanel(user);
      await user.selectOptions(
        screen.getByLabelText("カスタマイザー"),
        "スタジオ桜",
      );

      const filterButton = screen.getByRole("button", { name: /フィルター/ });
      expect(filterButton).toHaveTextContent("1");
    });
  });

  it("ソート順を切り替えられる", async () => {
    const user = userEvent.setup();
    testDb.doll.create({
      id: "d-1",
      name: "古いドール",
      createdAt: FIXED_NOW - 10 * MS_PER_DAY,
    });
    testDb.doll.create({
      id: "d-2",
      name: "新しいドール",
      createdAt: FIXED_NOW,
    });
    await seedDbFromTestDb();

    await renderWithProviders(<DollsPage />);

    await user.selectOptions(screen.getByLabelText("並び替え"), "oldest");

    const dollNames = screen
      .getAllByText(/^(?:古いドール|新しいドール)$/)
      .map((el) => el.textContent);
    expect(dollNames[0]).toBe("古いドール");
    expect(dollNames[1]).toBe("新しいドール");
  });

  it("名前順でソートできる", async () => {
    const user = userEvent.setup();
    testDb.doll.create({ id: "d-1", name: "ユキ" });
    testDb.doll.create({ id: "d-2", name: "アリス" });
    await seedDbFromTestDb();

    await renderWithProviders(<DollsPage />);

    await user.selectOptions(screen.getByLabelText("並び替え"), "name_asc");

    const dollNames = screen
      .getAllByText(/^(?:ユキ|アリス)$/)
      .map((el) => el.textContent);
    expect(dollNames[0]).toBe("アリス");
    expect(dollNames[1]).toBe("ユキ");
  });

  it("グリッド/リスト表示を切り替えられる", async () => {
    const user = userEvent.setup();
    testDb.doll.create({ id: "d-1", name: "リナ" });
    await seedDbFromTestDb();

    await renderWithProviders(<DollsPage />);

    const gridButton = screen.getByLabelText("グリッド表示");
    const listButton = screen.getByLabelText("リスト表示");

    expect(gridButton).toHaveAttribute("aria-pressed", "true");
    expect(listButton).toHaveAttribute("aria-pressed", "false");

    await user.click(listButton);

    expect(gridButton).toHaveAttribute("aria-pressed", "false");
    expect(listButton).toHaveAttribute("aria-pressed", "true");
  });

  it("フィルタと検索を組み合わせられる", async () => {
    const user = userEvent.setup();
    testDb.doll.create({ id: "d-1", name: "リナ", bodySize: "SD" });
    testDb.doll.create({ id: "d-2", name: "ユキ", bodySize: "SD" });
    testDb.doll.create({ id: "d-3", name: "ミク", bodySize: "MSD" });
    await seedDbFromTestDb();

    await renderWithProviders(<DollsPage />);

    await user.click(screen.getByRole("button", { name: /^SD \(/ }));
    await user.type(
      screen.getByPlaceholderText("名前やカスタマイザーで検索..."),
      "リナ",
    );

    expect(screen.getByText("リナ")).toBeInTheDocument();
    expect(screen.queryByText("ユキ")).not.toBeInTheDocument();
    expect(screen.queryByText("ミク")).not.toBeInTheDocument();
  });

  it("フィルタ結果が空の場合にメッセージを表示する", async () => {
    const user = userEvent.setup();
    testDb.doll.create({ id: "d-1", name: "リナ", bodySize: "SD" });
    await seedDbFromTestDb();

    await renderWithProviders(<DollsPage />);

    await user.click(screen.getByRole("button", { name: /^MSD/ }));

    expect(
      screen.getByText("一致するドールが見つかりません"),
    ).toBeInTheDocument();
  });

  it("リスト表示でカスタマイザー名がインラインで表示される", async () => {
    const user = userEvent.setup();
    testDb.doll.create({
      id: "d-1",
      name: "リナ",
      customizer: "スタジオ桜",
    });
    await seedDbFromTestDb();

    await renderWithProviders(<DollsPage />);

    await user.click(screen.getByLabelText("リスト表示"));

    expect(screen.getByText(/スタジオ桜/)).toBeInTheDocument();
  });
});
