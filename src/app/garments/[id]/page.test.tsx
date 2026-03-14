import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import type { Garment } from "@/types";
import { createTestGarment, FIXED_NOW } from "@/test/factories";
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

const mockGarments = vi.hoisted(() => ({
  value: [] as Garment[],
}));

const mockDeleteGarment = vi.hoisted(() => vi.fn());

vi.mock("@/stores/garmentAtoms", async () => {
  const { atom } = await import("jotai");
  return {
    garmentsAtom: atom(() => mockGarments.value),
    deleteGarmentAtom: atom(
      undefined,
      (_get: unknown, _set: unknown, id: unknown) => {
        mockDeleteGarment(id);
      },
    ),
  };
});

describe("GarmentDetailPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
    mockRouter.push.mockClear();
    mockDeleteGarment.mockClear();
    mockParams.value = { id: "garment-1" };
    mockGarments.value = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("服の詳細情報を表示する", () => {
    mockGarments.value = [
      createTestGarment({
        id: "garment-1",
        name: "白いドレス",
        category: "dress",
        dollSize: "MSD",
      }),
    ];
    renderWithProviders(<GarmentDetailPage />);

    expect(screen.getByText("白いドレス")).toBeInTheDocument();
    expect(screen.getByText(/MSD/)).toBeInTheDocument();
  });

  it("タグを表示する", () => {
    mockGarments.value = [
      createTestGarment({
        id: "garment-1",
        tags: ["フォーマル", "レース"],
      }),
    ];
    renderWithProviders(<GarmentDetailPage />);

    expect(screen.getByText("フォーマル")).toBeInTheDocument();
    expect(screen.getByText("レース")).toBeInTheDocument();
  });

  it("色を表示する", () => {
    mockGarments.value = [
      createTestGarment({
        id: "garment-1",
        colors: ["hsl(0, 100%, 50%)", "hsl(240, 100%, 50%)"],
      }),
    ];
    const { container } = renderWithProviders(<GarmentDetailPage />);

    const colorDots = container.querySelectorAll(
      'span[style*="background-color"]',
    );
    expect(colorDots.length).toBe(2);
  });

  it("存在しない服の場合にメッセージを表示する", () => {
    mockParams.value = { id: "non-existent" };
    mockGarments.value = [];
    renderWithProviders(<GarmentDetailPage />);

    expect(screen.getByText("服が見つかりません")).toBeInTheDocument();
    expect(screen.getByText("一覧に戻る")).toBeInTheDocument();
  });

  it("削除ボタンで服を削除しナビゲーションする", async () => {
    mockGarments.value = [
      createTestGarment({ id: "garment-1", name: "白いドレス" }),
    ];
    renderWithProviders(<GarmentDetailPage />);

    fireEvent.click(screen.getByText("削除"));
    await vi.waitFor(() => {
      expect(mockDeleteGarment).toHaveBeenCalledWith("garment-1");
    });
    expect(mockRouter.push).toHaveBeenCalledWith("/garments");
  });

  it("QR印刷ボタンで印刷ページに遷移する", () => {
    mockGarments.value = [
      createTestGarment({ id: "garment-1", name: "白いドレス" }),
    ];
    renderWithProviders(<GarmentDetailPage />);

    fireEvent.click(screen.getByText("QRを印刷"));

    expect(mockRouter.push).toHaveBeenCalledWith(
      expect.stringContaining("/print?"),
    );
    const calledUrl: string = mockRouter.push.mock.calls[0][0];
    expect(calledUrl).toContain("type=garment");
    expect(calledUrl).toContain("ids=garment-1");
  });
});
