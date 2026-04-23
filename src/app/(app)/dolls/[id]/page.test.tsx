import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { testDb, FIXED_NOW } from "@/test/mocks/db";
import { seedDbFromTestDb } from "@/test/helpers/seedDb";
import { renderWithProviders } from "@/test/testUtils";
import DollDetailPage from "./page";

const mockRouter = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
}));

const mockParams = vi.hoisted((): { value: Record<string, string> } => ({
  value: { id: "doll-1" },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  useParams: () => mockParams.value,
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

describe("DollDetailPage", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
    mockRouter.push.mockClear();
    mockParams.value = { id: "doll-1" };
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
    mockParams.value = { id: "non-existent" };

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
      expect(mockRouter.push).toHaveBeenCalledWith("/dolls");
    });
  });

  it("編集リンクが正しい", async () => {
    testDb.doll.create({ id: "doll-1", name: "リナ" });
    await seedDbFromTestDb();

    await renderWithProviders(<DollDetailPage />);

    fireEvent.click(screen.getByText("編集"));

    expect(mockRouter.push).toHaveBeenCalledWith("/dolls/doll-1/edit");
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
