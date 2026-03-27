import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
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
    await renderWithProviders(<DollsPage />);

    fireEvent.click(
      await screen.findByRole("button", { name: "ドールを登録" }),
    );
    expect(mockRouter.push).toHaveBeenCalledWith("/dolls/new");
  });

  it("ドール一覧を表示する", async () => {
    testDb.doll.create({ id: "d-1", name: "リナ" });
    testDb.doll.create({ id: "d-2", name: "ミユ" });
    await seedDbFromTestDb();

    await renderWithProviders(<DollsPage />);

    expect(screen.getByText("リナ")).toBeInTheDocument();
    expect(screen.getByText("ミユ")).toBeInTheDocument();
  });

  it("カードのリンクが正しい", async () => {
    testDb.doll.create({ id: "d-1", name: "リナ" });
    await seedDbFromTestDb();

    await renderWithProviders(<DollsPage />);

    const link = screen.getByRole("link", { name: /リナ/ });
    expect(link).toHaveAttribute("href", "/dolls/d-1");
  });
});
