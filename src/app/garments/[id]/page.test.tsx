import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { testDb, FIXED_NOW } from "@/test/mocks/db";
import { seedDbFromTestDb } from "@/test/helpers/seedDb";
import { renderWithProviders } from "@/test/testUtils";
import GarmentDetailPage from "./page";

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

describe("GarmentDetailPage", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
    mockRouter.push.mockClear();
    mockParams.value = { id: "garment-1" };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("服の詳細情報を表示する", async () => {
    testDb.garment.create({
      id: "garment-1",
      name: "白いドレス",
      category: "dress",
      dollSize: "MSD",
    });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentDetailPage />);

    expect(screen.getByText("白いドレス")).toBeInTheDocument();
    expect(screen.getByText(/MSD/)).toBeInTheDocument();
  });

  it("タグを表示する", async () => {
    testDb.garment.create({
      id: "garment-1",
      tags: ["フォーマル", "レース"],
    });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentDetailPage />);

    expect(screen.getByText("フォーマル")).toBeInTheDocument();
    expect(screen.getByText("レース")).toBeInTheDocument();
  });

  it("色を表示する", async () => {
    testDb.garment.create({
      id: "garment-1",
      colors: ["hsl(0, 100%, 50%)", "hsl(240, 100%, 50%)"],
    });
    await seedDbFromTestDb();

    const { container } = await renderWithProviders(<GarmentDetailPage />);

    const colorDots = container.querySelectorAll(
      'span[style*="background-color"]',
    );
    expect(colorDots.length).toBe(2);
  });

  it("存在しない服の場合にメッセージを表示する", async () => {
    mockParams.value = { id: "non-existent" };

    await renderWithProviders(<GarmentDetailPage />);

    expect(await screen.findByText("服が見つかりません")).toBeInTheDocument();
    expect(screen.getByText("一覧に戻る")).toBeInTheDocument();
  });

  it("削除ボタンで服を削除しナビゲーションする", async () => {
    testDb.garment.create({ id: "garment-1", name: "白いドレス" });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentDetailPage />);

    fireEvent.click(screen.getByText("削除"));

    const { db } = await import("@/lib/db/dexie");
    await waitFor(async () => {
      const garment = await db.garments.get("garment-1");
      expect(garment).toBeUndefined();
    });
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith("/garments");
    });
  });

  it("QR印刷ボタンで印刷ページに遷移する", async () => {
    testDb.garment.create({ id: "garment-1", name: "白いドレス" });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentDetailPage />);

    fireEvent.click(screen.getByText("QRを印刷"));

    expect(mockRouter.push).toHaveBeenCalledWith(
      expect.stringContaining("/print?"),
    );
    expect(mockRouter.push).toHaveBeenCalledWith(
      expect.stringContaining("type=garment"),
    );
    expect(mockRouter.push).toHaveBeenCalledWith(
      expect.stringContaining("ids=garment-1"),
    );
  });
});
