import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MS_PER_DAY } from "@/lib/constants";
import { testDb, FIXED_NOW } from "@/test/mocks/db";
import { seedDbFromTestDb } from "@/test/helpers/seedDb";
import { renderWithProviders } from "@/test/testUtils";
import GarmentsPage from "./page";

const navMod = await vi.hoisted(
  async () => await import("@/test/mocks/modules/nextNavigation"),
);
const linkMod = await vi.hoisted(
  async () => await import("@/test/mocks/modules/nextLink"),
);
vi.mock("next/navigation", navMod.nextNavigationFactory);
vi.mock("next/link", linkMod.nextLinkFactory);

const navHandle: { current: ReturnType<typeof navMod.setupNextNavigation> } = {
  current: navMod.setupNextNavigation(),
};

const openFilterPanel = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: /フィルター/ }));
};

const selectDollFromCombobox = async (
  user: ReturnType<typeof userEvent.setup>,
  dollName: string,
) => {
  const combobox = screen.getByRole("combobox", { name: /ドール/ });
  await user.click(combobox);
  await user.click(screen.getByRole("option", { name: new RegExp(dollName) }));
};

describe("GarmentsPage", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
    navHandle.current = navMod.setupNextNavigation();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("服がない場合に空状態を表示する", async () => {
    await renderWithProviders(<GarmentsPage />);

    expect(await screen.findByText("まだ服がありません")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "服を登録" }),
    ).toBeInTheDocument();
  });

  it("空状態のCTAクリックで新規登録ページに遷移する", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<GarmentsPage />);

    await user.click(await screen.findByRole("button", { name: "服を登録" }));
    expect(navHandle.current.router.push).toHaveBeenCalledWith("/garments/new");
  });

  it("服一覧を表示する", async () => {
    testDb.garment.create({ id: "g-1", name: "白いドレス" });
    testDb.garment.create({ id: "g-2", name: "黒いコート" });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentsPage />);

    expect(screen.getByText("白いドレス")).toBeInTheDocument();
    expect(screen.getByText("黒いコート")).toBeInTheDocument();
  });

  it("ブランド名が一覧に表示される", async () => {
    testDb.garment.create({ id: "g-1", name: "白いドレス", brand: "ボークス" });
    testDb.garment.create({ id: "g-2", name: "黒いコート", brand: null });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentsPage />);

    expect(screen.getByText("ボークス")).toBeInTheDocument();
  });

  it("名前で検索できる", async () => {
    const user = userEvent.setup();
    testDb.garment.create({ id: "g-1", name: "白いドレス" });
    testDb.garment.create({
      id: "g-2",
      name: "黒いコート",
      category: "outer",
    });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentsPage />);

    await user.type(
      screen.getByPlaceholderText("名前やタグで検索..."),
      "ドレス",
    );

    expect(screen.getByText("白いドレス")).toBeInTheDocument();
    expect(screen.queryByText("黒いコート")).not.toBeInTheDocument();
  });

  it("タグで検索できる", async () => {
    const user = userEvent.setup();
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

    await user.type(
      screen.getByPlaceholderText("名前やタグで検索..."),
      "フォーマル",
    );

    expect(screen.getByText("白いドレス")).toBeInTheDocument();
    expect(screen.queryByText("黒いコート")).not.toBeInTheDocument();
  });

  describe("フィルターパネル", () => {
    it("カテゴリは常時表示、信頼度フィルターは初期非表示", async () => {
      testDb.garment.create({ id: "g-1", name: "白いドレス" });
      await seedDbFromTestDb();

      await renderWithProviders(<GarmentsPage />);

      expect(
        screen.getByRole("button", { name: "ドレス" }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "要確認" }),
      ).not.toBeInTheDocument();
    });

    it("フィルターボタンをクリックすると信頼度・ドールフィルターが表示される", async () => {
      const user = userEvent.setup();
      testDb.garment.create({ id: "g-1", name: "白いドレス" });
      testDb.doll.create({ id: "d-1", name: "リナ", bodySize: "SD" });
      await seedDbFromTestDb();

      await renderWithProviders(<GarmentsPage />);

      await openFilterPanel(user);

      expect(
        screen.getByRole("button", { name: "要確認" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("combobox", { name: /ドール/ }),
      ).toBeInTheDocument();
    });

    it("フィルターボタンを再クリックするとパネルが閉じる", async () => {
      const user = userEvent.setup();
      testDb.garment.create({ id: "g-1", name: "白いドレス" });
      await seedDbFromTestDb();

      await renderWithProviders(<GarmentsPage />);

      await openFilterPanel(user);
      expect(
        screen.getByRole("button", { name: "要確認" }),
      ).toBeInTheDocument();

      await openFilterPanel(user);
      expect(
        screen.queryByRole("button", { name: "要確認" }),
      ).not.toBeInTheDocument();
    });

    it("アクティブフィルター数がバッジで表示される", async () => {
      const user = userEvent.setup();
      testDb.garment.create({
        id: "g-1",
        name: "白いドレス",
        lastScannedAt: FIXED_NOW - 20 * MS_PER_DAY,
      });
      await seedDbFromTestDb();

      await renderWithProviders(<GarmentsPage />);

      await openFilterPanel(user);
      await user.click(screen.getByRole("button", { name: "要確認" }));

      const filterButton = screen.getByRole("button", { name: /フィルター/ });
      expect(filterButton).toHaveTextContent("1");
    });
  });

  it("カテゴリでフィルタできる", async () => {
    const user = userEvent.setup();
    testDb.garment.create({ id: "g-1", name: "白いドレス", category: "dress" });
    testDb.garment.create({ id: "g-2", name: "黒いコート", category: "outer" });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentsPage />);

    await user.click(screen.getByRole("button", { name: "ドレス" }));

    expect(screen.getByText("白いドレス")).toBeInTheDocument();
    expect(screen.queryByText("黒いコート")).not.toBeInTheDocument();
  });

  it("信頼度でフィルタできる", async () => {
    const user = userEvent.setup();
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

    await openFilterPanel(user);
    await user.click(screen.getByRole("button", { name: "要確認" }));

    expect(screen.queryByText("確定の服")).not.toBeInTheDocument();
    expect(screen.getByText("要確認の服")).toBeInTheDocument();
  });

  it("ソート順を切り替えられる", async () => {
    const user = userEvent.setup();
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

    await user.selectOptions(screen.getByLabelText("並び替え"), "oldest");

    const garmentNames = screen
      .getAllByText(/^(?:古い服|新しい服)$/)
      .map((el) => el.textContent);
    expect(garmentNames[0]).toBe("古い服");
    expect(garmentNames[1]).toBe("新しい服");
  });

  it("フィルタと検索を組み合わせられる", async () => {
    const user = userEvent.setup();
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

    await user.click(screen.getByRole("button", { name: "ドレス" }));
    await user.type(screen.getByPlaceholderText("名前やタグで検索..."), "白い");

    expect(screen.getByText("白いドレス")).toBeInTheDocument();
    expect(screen.queryByText("黒いドレス")).not.toBeInTheDocument();
    expect(screen.queryByText("白いコート")).not.toBeInTheDocument();
  });

  it("フィルタ結果が空の場合にメッセージを表示する", async () => {
    const user = userEvent.setup();
    testDb.garment.create({
      id: "g-1",
      name: "白いドレス",
      category: "dress",
    });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentsPage />);

    await user.click(screen.getByRole("button", { name: "アウター" }));

    expect(screen.getByText("一致する服が見つかりません")).toBeInTheDocument();
  });

  it("グリッド/リスト表示を切り替えられる", async () => {
    const user = userEvent.setup();
    testDb.garment.create({ id: "g-1", name: "白いドレス" });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentsPage />);

    const gridButton = screen.getByLabelText("グリッド表示");
    const listButton = screen.getByLabelText("リスト表示");

    expect(gridButton).toHaveAttribute("aria-pressed", "true");
    expect(listButton).toHaveAttribute("aria-pressed", "false");

    await user.click(listButton);

    expect(gridButton).toHaveAttribute("aria-pressed", "false");
    expect(listButton).toHaveAttribute("aria-pressed", "true");
  });

  describe("ドールフィルター", () => {
    it("ドールのボディサイズとカスタマイザーが表示される", async () => {
      const user = userEvent.setup();
      testDb.garment.create({ id: "g-1", name: "白いドレス" });
      testDb.doll.create({
        id: "d-1",
        name: "リナ",
        bodySize: "SD",
        customizer: "スタジオ桜",
      });
      await seedDbFromTestDb();

      await renderWithProviders(<GarmentsPage />);

      await openFilterPanel(user);
      const combobox = screen.getByRole("combobox", { name: /ドール/ });
      await user.click(combobox);

      const dollOption = screen.getByRole("option", { name: /リナ/ });
      expect(dollOption).toHaveTextContent("リナ");
      expect(dollOption).toHaveTextContent(/SD \(~57cm\)/);
      expect(dollOption).toHaveTextContent(/スタジオ桜/);
    });

    it("カスタマイザーがないドールはサイズのみ表示", async () => {
      const user = userEvent.setup();
      testDb.garment.create({ id: "g-1", name: "白いドレス" });
      testDb.doll.create({
        id: "d-1",
        name: "ユキ",
        bodySize: "MSD",
        customizer: null,
      });
      await seedDbFromTestDb();

      await renderWithProviders(<GarmentsPage />);

      await openFilterPanel(user);
      const combobox = screen.getByRole("combobox", { name: /ドール/ });
      await user.click(combobox);

      const dollOption = screen.getByRole("option", { name: /ユキ/ });
      expect(dollOption).toHaveTextContent("ユキ");
      expect(dollOption).toHaveTextContent(/MSD \(~43cm\)/);
      expect(dollOption.textContent).not.toMatch(/\//);
    });

    it("ドールフィルターで服を絞り込める", async () => {
      const user = userEvent.setup();
      testDb.garment.create({
        id: "g-1",
        name: "SD用ドレス",
        dollSizes: ["SD"],
      });
      testDb.garment.create({
        id: "g-2",
        name: "MSD用コート",
        dollSizes: ["MSD"],
      });
      testDb.doll.create({ id: "d-1", name: "リナ", bodySize: "SD" });
      await seedDbFromTestDb();

      await renderWithProviders(<GarmentsPage />);

      await openFilterPanel(user);
      await selectDollFromCombobox(user, "リナ");

      expect(screen.getByText("SD用ドレス")).toBeInTheDocument();
      expect(screen.queryByText("MSD用コート")).not.toBeInTheDocument();
    });

    it("「全ドール」選択でフィルターを解除できる", async () => {
      const user = userEvent.setup();
      testDb.garment.create({
        id: "g-1",
        name: "SD用ドレス",
        dollSizes: ["SD"],
      });
      testDb.garment.create({
        id: "g-2",
        name: "MSD用コート",
        dollSizes: ["MSD"],
      });
      testDb.doll.create({ id: "d-1", name: "リナ", bodySize: "SD" });
      await seedDbFromTestDb();

      await renderWithProviders(<GarmentsPage />);

      await openFilterPanel(user);
      await selectDollFromCombobox(user, "リナ");
      expect(screen.queryByText("MSD用コート")).not.toBeInTheDocument();

      await selectDollFromCombobox(user, "全ドール");
      expect(screen.getByText("MSD用コート")).toBeInTheDocument();
    });
  });

  it("ドール選択がアクティブフィルター数に含まれる", async () => {
    const user = userEvent.setup();
    testDb.garment.create({
      id: "g-1",
      name: "SD用ドレス",
      dollSizes: ["SD"],
    });
    testDb.doll.create({ id: "d-1", name: "リナ", bodySize: "SD" });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentsPage />);

    await openFilterPanel(user);
    await selectDollFromCombobox(user, "リナ");

    const filterButton = screen.getByRole("button", { name: /フィルター/ });
    expect(filterButton).toHaveTextContent("1");
  });

  it("フィルターパネルにセクションラベルが表示される", async () => {
    const user = userEvent.setup();
    testDb.garment.create({ id: "g-1", name: "白いドレス" });
    testDb.doll.create({ id: "d-1", name: "リナ", bodySize: "SD" });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentsPage />);

    await openFilterPanel(user);

    expect(screen.getByText("信頼度")).toBeInTheDocument();
    expect(screen.getByText("サイズ")).toBeInTheDocument();
    expect(screen.getByText("ドール")).toBeInTheDocument();
  });

  it("リスト表示でブランド名がインラインで表示される", async () => {
    const user = userEvent.setup();
    testDb.garment.create({ id: "g-1", name: "白いドレス", brand: "アゾン" });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentsPage />);

    await user.click(screen.getByLabelText("リスト表示"));

    expect(screen.getByText(/アゾン/)).toBeInTheDocument();
  });
});
