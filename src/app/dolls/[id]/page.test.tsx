import { describe, it, expect, vi, aroundEach } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { testDb, FIXED_NOW } from "@/test/mocks/db";
import { seedDbFromTestDb } from "@/test/helpers/seedDb";
import { setupNextNavigation } from "@/test/mocks/modules/nextNavigation";
import { renderWithProviders } from "@/test/testUtils";
import DollDetailPage from "./page";

const navHandle: { current: ReturnType<typeof setupNextNavigation> } = {
  current: setupNextNavigation(),
};

describe("DollDetailPage", () => {
  aroundEach(async (runTest) => {
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
    navHandle.current = setupNextNavigation({
      params: { id: "doll-1" },
    });

    await runTest();

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

  it("画像が登録されているドールは img タグが描画される", async () => {
    testDb.doll.create({
      id: "doll-1",
      name: "リナ",
      imageUrl: "https://example.com/doll.png",
    });
    await seedDbFromTestDb();

    await renderWithProviders(<DollDetailPage />);

    const img = screen.getByAltText("リナ");
    expect(img).toHaveAttribute("src", "https://example.com/doll.png");
  });

  it("アーカイブ済みドールは復元 / 完全に削除ボタンが表示される", async () => {
    testDb.doll.create({
      id: "doll-1",
      name: "リナ",
      archivedAt: FIXED_NOW - 86_400_000,
    });
    await seedDbFromTestDb();

    await renderWithProviders(<DollDetailPage />);

    expect(screen.getByText("復元")).toBeInTheDocument();
    expect(screen.getByText("完全に削除")).toBeInTheDocument();
  });

  it("アーカイブ済みドールの復元ボタンで /dolls に戻る", async () => {
    testDb.doll.create({
      id: "doll-1",
      name: "リナ",
      archivedAt: FIXED_NOW - 86_400_000,
    });
    await seedDbFromTestDb();

    await renderWithProviders(<DollDetailPage />);

    fireEvent.click(screen.getByText("復元"));

    await waitFor(() => {
      expect(navHandle.current.router.push).toHaveBeenCalledWith("/dolls");
    });
  });

  it("アーカイブ済みドールの完全削除確認後に /archive に遷移する", async () => {
    testDb.doll.create({
      id: "doll-1",
      name: "リナ",
      archivedAt: FIXED_NOW - 86_400_000,
    });
    await seedDbFromTestDb();

    await renderWithProviders(<DollDetailPage />);

    fireEvent.click(screen.getByText("完全に削除"));

    const dialog = screen.getByRole("dialog");
    const confirmButton = within(dialog).getByRole("button", {
      name: "削除",
    });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(navHandle.current.router.push).toHaveBeenCalledWith("/archive");
    });
  });

  it("存在しないドールで「一覧に戻る」を押すと /dolls に遷移する", async () => {
    navHandle.current.setParams({ id: "non-existent" });

    await renderWithProviders(<DollDetailPage />);

    fireEvent.click(await screen.findByText("一覧に戻る"));

    expect(navHandle.current.router.push).toHaveBeenCalledWith("/dolls");
  });
});
