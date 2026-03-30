import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, within } from "@testing-library/react";
import { MS_PER_DAY } from "@/lib/constants";
import { testDb, FIXED_NOW } from "@/test/mocks/db";
import { seedDbFromTestDb } from "@/test/helpers/seedDb";
import { renderWithProviders } from "@/test/testUtils";
import DashboardPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
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

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("服がない場合に統計が全て0で表示される", async () => {
    await renderWithProviders(<DashboardPage />);

    expect(await screen.findByText("ステータス")).toBeInTheDocument();
    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBeGreaterThanOrEqual(3);
  });

  it("統計が正しく表示される", async () => {
    testDb.garment.create({
      id: "g-1",
      name: "確定1",
      lastScannedAt: FIXED_NOW,
    });
    testDb.garment.create({
      id: "g-2",
      name: "確定2",
      lastScannedAt: FIXED_NOW - 5 * MS_PER_DAY,
    });
    testDb.garment.create({
      id: "g-3",
      name: "要確認",
      lastScannedAt: FIXED_NOW - 25 * MS_PER_DAY,
    });
    await seedDbFromTestDb();

    await renderWithProviders(<DashboardPage />);

    const statsHeading = await screen.findByText("ステータス");
    const statsSection = within(statsHeading.closest("section")!);
    expect(statsSection.getByText("3")).toBeInTheDocument();
    expect(statsSection.getByText("2")).toBeInTheDocument();
    expect(statsSection.getByText("1")).toBeInTheDocument();
  });

  it("3日以上チェックアウト中の服がある場合に警告を表示する", async () => {
    testDb.garment.create({
      id: "g-1",
      name: "取り出し中の服",
      status: "checked_out",
      checkedOutAt: FIXED_NOW - 4 * MS_PER_DAY,
    });
    await seedDbFromTestDb();

    await renderWithProviders(<DashboardPage />);

    expect(
      await screen.findByText("1着の服が3日以上取り出し中です"),
    ).toBeInTheDocument();
  });

  it("3日未満のチェックアウトでは別メッセージを表示する", async () => {
    testDb.garment.create({
      id: "g-1",
      name: "取り出し中の服",
      status: "checked_out",
      checkedOutAt: FIXED_NOW - 1 * MS_PER_DAY,
    });
    await seedDbFromTestDb();

    await renderWithProviders(<DashboardPage />);

    expect(await screen.findByText("1着の服を取り出し中")).toBeInTheDocument();
  });

  it("最近のアイテムをlastScannedAt順で表示する", async () => {
    testDb.garment.create({
      id: "g-1",
      name: "古い服",
      lastScannedAt: FIXED_NOW - 10 * MS_PER_DAY,
    });
    testDb.garment.create({
      id: "g-2",
      name: "最近の服",
      lastScannedAt: FIXED_NOW,
    });
    await seedDbFromTestDb();

    await renderWithProviders(<DashboardPage />);

    expect(await screen.findByText("最近のアイテム")).toBeInTheDocument();
    expect(screen.getByText("古い服")).toBeInTheDocument();
    expect(screen.getByText("最近の服")).toBeInTheDocument();
  });

  it("最近のアイテムは最大8件まで表示される", async () => {
    Array.from({ length: 10 }, (_, i) =>
      testDb.garment.create({
        id: `g-${i}`,
        name: `服${i}`,
        lastScannedAt: FIXED_NOW - i * MS_PER_DAY,
      }),
    );
    await seedDbFromTestDb();

    await renderWithProviders(<DashboardPage />);

    expect(await screen.findByText("服0")).toBeInTheDocument();
    expect(screen.getByText("服7")).toBeInTheDocument();
    expect(screen.queryByText("服8")).not.toBeInTheDocument();
    expect(screen.queryByText("服9")).not.toBeInTheDocument();
  });
});
