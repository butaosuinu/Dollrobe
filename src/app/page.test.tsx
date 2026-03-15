import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen } from "@testing-library/react";
import type { Garment } from "@/types";
import { MS_PER_DAY } from "@/lib/constants";
import { createTestGarment, FIXED_NOW } from "@/test/factories";
import { renderWithProviders } from "@/test/testUtils";
import DashboardPage from "./page";

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

const mockGarments = vi.hoisted((): { value: Garment[] } => ({
  value: [],
}));

vi.mock("@/stores/garmentAtoms", async () => {
  const { atom } = await import("jotai");
  return {
    garmentsAtom: atom(() => mockGarments.value),
  };
});

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
    mockGarments.value = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("服がない場合に統計が全て0で表示される", () => {
    renderWithProviders(<DashboardPage />);

    expect(screen.getByText("ダッシュボード")).toBeInTheDocument();
    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBeGreaterThanOrEqual(3);
  });

  it("統計が正しく表示される", () => {
    mockGarments.value = [
      createTestGarment({
        id: "g-1",
        name: "確定1",
        lastScannedAt: FIXED_NOW,
      }),
      createTestGarment({
        id: "g-2",
        name: "確定2",
        lastScannedAt: FIXED_NOW - 5 * MS_PER_DAY,
      }),
      createTestGarment({
        id: "g-3",
        name: "要確認",
        lastScannedAt: FIXED_NOW - 25 * MS_PER_DAY,
      }),
    ];
    renderWithProviders(<DashboardPage />);

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("3日以上チェックアウト中の服がある場合に警告を表示する", () => {
    mockGarments.value = [
      createTestGarment({
        id: "g-1",
        name: "取り出し中の服",
        status: "checked_out",
        checkedOutAt: FIXED_NOW - 4 * MS_PER_DAY,
      }),
    ];
    renderWithProviders(<DashboardPage />);

    expect(
      screen.getByText("1着の服が3日以上取り出し中です"),
    ).toBeInTheDocument();
  });

  it("3日未満のチェックアウトでは別メッセージを表示する", () => {
    mockGarments.value = [
      createTestGarment({
        id: "g-1",
        name: "取り出し中の服",
        status: "checked_out",
        checkedOutAt: FIXED_NOW - 1 * MS_PER_DAY,
      }),
    ];
    renderWithProviders(<DashboardPage />);

    expect(screen.getByText("1着の服を取り出し中")).toBeInTheDocument();
  });

  it("最近のアイテムをlastScannedAt順で表示する", () => {
    mockGarments.value = [
      createTestGarment({
        id: "g-1",
        name: "古い服",
        lastScannedAt: FIXED_NOW - 10 * MS_PER_DAY,
      }),
      createTestGarment({
        id: "g-2",
        name: "最近の服",
        lastScannedAt: FIXED_NOW,
      }),
    ];
    renderWithProviders(<DashboardPage />);

    expect(screen.getByText("最近のアイテム")).toBeInTheDocument();
    expect(screen.getByText("古い服")).toBeInTheDocument();
    expect(screen.getByText("最近の服")).toBeInTheDocument();
  });

  it("最近のアイテムは最大8件まで表示される", () => {
    mockGarments.value = Array.from({ length: 10 }, (_, i) =>
      createTestGarment({
        id: `g-${i}`,
        name: `服${i}`,
        lastScannedAt: FIXED_NOW - i * MS_PER_DAY,
      }),
    );
    renderWithProviders(<DashboardPage />);

    expect(screen.getByText("服0")).toBeInTheDocument();
    expect(screen.getByText("服7")).toBeInTheDocument();
    expect(screen.queryByText("服8")).not.toBeInTheDocument();
    expect(screen.queryByText("服9")).not.toBeInTheDocument();
  });
});
