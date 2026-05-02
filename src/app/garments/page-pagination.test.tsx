import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MS_PER_DAY } from "@/lib/constants";
import { testDb, FIXED_NOW } from "@/test/mocks/db";
import { seedDbFromTestDb } from "@/test/helpers/seedDb";
import { setupNextNavigation } from "@/test/mocks/modules/nextNavigation";
import { renderWithProviders } from "@/test/testUtils";
import GarmentsPage from "./page";

describe("GarmentsPage ページネーション", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
    setupNextNavigation();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createGarments = (count: number) => {
    Array.from({ length: count }, (_, idx) => {
      const i = idx + 1;
      return testDb.garment.create({
        id: `g-${i}`,
        name: `服-${String(i).padStart(2, "0")}`,
        createdAt: FIXED_NOW - (count - i) * MS_PER_DAY,
      });
    });
  };

  const clickNextPage = async (user: ReturnType<typeof userEvent.setup>) => {
    const buttons = screen.getAllByLabelText("次のページ");
    const button = buttons[0];
    expect(button).toBeDefined();
    if (button === undefined) return;
    await user.click(button);
  };

  it("アイテム数がページサイズを超えるとページネーションが表示される", async () => {
    createGarments(25);
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentsPage />);

    expect(
      screen.getByRole("navigation", { name: "ページネーション" }),
    ).toBeInTheDocument();
    expect(screen.getAllByLabelText("次のページ").length).toBeGreaterThan(0);
  });

  it("アイテム数がページサイズ以下のときナビゲーションボタンが非表示", async () => {
    createGarments(5);
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentsPage />);

    expect(screen.getByText("1-5 / 5件")).toBeInTheDocument();
    expect(screen.getByLabelText("表示件数")).toBeInTheDocument();
    expect(screen.queryByLabelText("次のページ")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("前のページ")).not.toBeInTheDocument();
  });

  it("1ページ目にはページサイズ分のアイテムのみ表示される", async () => {
    createGarments(25);
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentsPage />);

    const displayed = screen.getAllByText(/^服-\d+$/);
    expect(displayed).toHaveLength(20);
    expect(screen.getByText("服-25")).toBeInTheDocument();
    expect(screen.queryByText("服-05")).not.toBeInTheDocument();
  });

  it("次のページに遷移すると残りのアイテムが表示される", async () => {
    createGarments(25);
    await seedDbFromTestDb();
    const user = userEvent.setup();

    await renderWithProviders(<GarmentsPage />);

    await clickNextPage(user);

    const displayed = screen.getAllByText(/^服-\d+$/);
    expect(displayed).toHaveLength(5);
    expect(screen.getByText("服-05")).toBeInTheDocument();
    expect(screen.queryByText("服-25")).not.toBeInTheDocument();
  });

  it("件数表示がページ遷移に応じて更新される", async () => {
    createGarments(25);
    await seedDbFromTestDb();
    const user = userEvent.setup();

    await renderWithProviders(<GarmentsPage />);

    expect(screen.getByText("1-20 / 25件")).toBeInTheDocument();

    await clickNextPage(user);

    expect(screen.getByText("21-25 / 25件")).toBeInTheDocument();
  });

  it("表示件数を変更すると全アイテムが1ページに収まる", async () => {
    createGarments(25);
    await seedDbFromTestDb();
    const user = userEvent.setup();

    await renderWithProviders(<GarmentsPage />);

    await user.selectOptions(screen.getByLabelText("表示件数"), "50");

    const displayed = screen.getAllByText(/^服-\d+$/);
    expect(displayed).toHaveLength(25);
    expect(screen.queryByLabelText("次のページ")).not.toBeInTheDocument();
  });

  it("フィルター適用でページが1にリセットされる", async () => {
    createGarments(25);
    await seedDbFromTestDb();
    const user = userEvent.setup();

    await renderWithProviders(<GarmentsPage />);

    await clickNextPage(user);
    expect(screen.getByText("21-25 / 25件")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "ドレス" }));

    expect(screen.getByText("1-20 / 25件")).toBeInTheDocument();
  });

  it("検索でページが1にリセットされる", async () => {
    createGarments(25);
    await seedDbFromTestDb();
    const user = userEvent.setup();

    await renderWithProviders(<GarmentsPage />);

    await clickNextPage(user);
    expect(screen.getByText("21-25 / 25件")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("名前やタグで検索..."), "服");

    expect(screen.getByText("1-20 / 25件")).toBeInTheDocument();
  });
});
