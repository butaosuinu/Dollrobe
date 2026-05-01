import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { testDb, FIXED_NOW } from "@/test/mocks/db";
import { seedDbFromTestDb } from "@/test/helpers/seedDb";
import { renderWithProviders } from "@/test/testUtils";
import DollDetailPage from "./page";

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

describe("DollDetailPage", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
    navHandle.current = navMod.setupNextNavigation({
      params: { id: "doll-1" },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ドールの詳細情報を表示する", async () => {
    testDb.doll.create({
      id: "doll-1",
      name: "リナ",
      bodySize: "MSD",
    });
    await seedDbFromTestDb();

    await renderWithProviders(<DollDetailPage />);

    expect(screen.getByText("リナ")).toBeInTheDocument();
    expect(screen.getAllByText(/MSD/).length).toBeGreaterThanOrEqual(1);
  });

  it("ヘッド型番がある場合に表示する", async () => {
    testDb.doll.create({
      id: "doll-1",
      name: "リナ",
      headModel: "DDH-01",
    });
    await seedDbFromTestDb();

    await renderWithProviders(<DollDetailPage />);

    expect(screen.getByText("DDH-01")).toBeInTheDocument();
  });

  it("メモがある場合に表示する", async () => {
    testDb.doll.create({
      id: "doll-1",
      name: "リナ",
      memo: "テストメモ",
    });
    await seedDbFromTestDb();

    await renderWithProviders(<DollDetailPage />);

    expect(screen.getByText("テストメモ")).toBeInTheDocument();
  });

  it("存在しないドールの場合にメッセージを表示する", async () => {
    navHandle.current.setParams({ id: "non-existent" });

    await renderWithProviders(<DollDetailPage />);

    expect(
      await screen.findByText("ドールが見つかりません"),
    ).toBeInTheDocument();
    expect(screen.getByText("一覧に戻る")).toBeInTheDocument();
  });

  it("アーカイブボタンで確認後にナビゲーションする", async () => {
    testDb.doll.create({ id: "doll-1", name: "リナ" });
    await seedDbFromTestDb();

    await renderWithProviders(<DollDetailPage />);

    fireEvent.click(screen.getByText("アーカイブ"));

    const dialog = screen.getByRole("dialog");
    const confirmButton = within(dialog).getByRole("button", {
      name: "アーカイブ",
    });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(navHandle.current.router.push).toHaveBeenCalledWith("/dolls");
    });
  });

  it("編集リンクが正しい", async () => {
    testDb.doll.create({ id: "doll-1", name: "リナ" });
    await seedDbFromTestDb();

    await renderWithProviders(<DollDetailPage />);

    fireEvent.click(screen.getByText("編集"));

    expect(navHandle.current.router.push).toHaveBeenCalledWith(
      "/dolls/doll-1/edit",
    );
  });

  it("着用可能な服を表示する", async () => {
    testDb.doll.create({
      id: "doll-1",
      name: "リナ",
      bodySize: "SD",
    });
    testDb.garment.create({
      id: "g-1",
      name: "白いドレス",
      dollSizes: ["SD", "MSD"],
    });
    await seedDbFromTestDb();

    await renderWithProviders(<DollDetailPage />);

    expect(screen.getByText("白いドレス")).toBeInTheDocument();
  });

  it("着用可能な服がない場合にメッセージを表示する", async () => {
    testDb.doll.create({
      id: "doll-1",
      name: "リナ",
      bodySize: "YoSD",
    });
    testDb.garment.create({
      id: "g-1",
      name: "白いドレス",
      dollSizes: ["SD"],
    });
    await seedDbFromTestDb();

    await renderWithProviders(<DollDetailPage />);

    expect(screen.getByText("着用可能な服がありません")).toBeInTheDocument();
  });
});
