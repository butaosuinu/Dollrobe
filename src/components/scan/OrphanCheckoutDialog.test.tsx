import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import type { Garment } from "@/types";
import { MS_PER_DAY } from "@/lib/constants";
import { createTestGarment, FIXED_NOW } from "@/test/factories";
import { renderWithProviders } from "@/test/testUtils";
import OrphanCheckoutDialog from "./OrphanCheckoutDialog";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockOrphans = vi.hoisted((): { value: readonly Garment[] } => ({
  value: [],
}));
const mockResolveStillUsing = vi.hoisted(() => vi.fn());
const mockResolveLost = vi.hoisted(() => vi.fn());

vi.mock("@/stores/orphanAtoms", async () => {
  const { atom } = await import("jotai");
  return {
    orphanedCheckoutsAtom: atom(() => mockOrphans.value),
    resolveStillUsingAtom: atom(
      undefined,
      (_get: unknown, _set: unknown, garmentId: string) => {
        mockResolveStillUsing(garmentId);
      },
    ),
    resolveLostAtom: atom(
      undefined,
      (_get: unknown, _set: unknown, garmentId: string) => {
        mockResolveLost(garmentId);
      },
    ),
  };
});

describe("OrphanCheckoutDialog", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
    mockOrphans.value = [];
    mockPush.mockClear();
    mockResolveStillUsing.mockClear();
    mockResolveLost.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("孤立アイテムがない場合はダイアログが表示されない", () => {
    renderWithProviders(<OrphanCheckoutDialog />);

    expect(
      screen.queryByText("取り出し中の服を確認", { exact: false }),
    ).not.toBeInTheDocument();
  });

  it("孤立アイテムの名前と経過日数が表示される", () => {
    mockOrphans.value = [
      createTestGarment({
        id: "g-1",
        name: "テストドレスA",
        status: "checked_out",
        checkedOutAt: FIXED_NOW - 5 * MS_PER_DAY,
      }),
      createTestGarment({
        id: "g-2",
        name: "テストドレスB",
        status: "checked_out",
        checkedOutAt: FIXED_NOW - 10 * MS_PER_DAY,
      }),
    ];

    renderWithProviders(<OrphanCheckoutDialog />);

    expect(screen.getByText("テストドレスA")).toBeInTheDocument();
    expect(screen.getByText("テストドレスB")).toBeInTheDocument();
    expect(screen.getByText("5日前から取り出し中")).toBeInTheDocument();
    expect(screen.getByText("10日前から取り出し中")).toBeInTheDocument();
    expect(screen.getByText("取り出し中の服を確認（2件）")).toBeInTheDocument();
  });

  it("「まだ使用中」をクリックするとresolveStillUsingAtomが呼ばれリストから消える", () => {
    mockOrphans.value = [
      createTestGarment({
        id: "g-1",
        name: "テストドレスA",
        status: "checked_out",
        checkedOutAt: FIXED_NOW - 5 * MS_PER_DAY,
      }),
    ];

    renderWithProviders(<OrphanCheckoutDialog />);

    const stillUsingButton = screen.getByRole("button", {
      name: /まだ使用中/,
    });
    fireEvent.click(stillUsingButton);

    expect(mockResolveStillUsing).toHaveBeenCalledWith("g-1");
    expect(screen.queryByText("テストドレスA")).not.toBeInTheDocument();
  });

  it("「なくした」をクリックするとresolveLostAtomが呼ばれリストから消える", () => {
    mockOrphans.value = [
      createTestGarment({
        id: "g-1",
        name: "テストドレスA",
        status: "checked_out",
        checkedOutAt: FIXED_NOW - 5 * MS_PER_DAY,
      }),
    ];

    renderWithProviders(<OrphanCheckoutDialog />);

    const lostButton = screen.getByRole("button", { name: /なくした/ });
    fireEvent.click(lostButton);

    expect(mockResolveLost).toHaveBeenCalledWith("g-1");
    expect(screen.queryByText("テストドレスA")).not.toBeInTheDocument();
  });

  it("「しまった」をクリックするとスキャン画面に遷移する", () => {
    mockOrphans.value = [
      createTestGarment({
        id: "g-1",
        name: "テストドレスA",
        status: "checked_out",
        checkedOutAt: FIXED_NOW - 5 * MS_PER_DAY,
      }),
    ];

    renderWithProviders(<OrphanCheckoutDialog />);

    const storedBackButton = screen.getByRole("button", { name: /しまった/ });
    fireEvent.click(storedBackButton);

    expect(mockPush).toHaveBeenCalledWith("/scan");
  });

  it("全件解決するとダイアログが自動クローズする", () => {
    mockOrphans.value = [
      createTestGarment({
        id: "g-1",
        name: "テストドレスA",
        status: "checked_out",
        checkedOutAt: FIXED_NOW - 5 * MS_PER_DAY,
      }),
      createTestGarment({
        id: "g-2",
        name: "テストドレスB",
        status: "checked_out",
        checkedOutAt: FIXED_NOW - 7 * MS_PER_DAY,
      }),
    ];

    renderWithProviders(<OrphanCheckoutDialog />);

    expect(screen.getByText("テストドレスA")).toBeInTheDocument();
    expect(screen.getByText("テストドレスB")).toBeInTheDocument();

    const stillUsingButtons = screen.getAllByRole("button", {
      name: /まだ使用中/,
    });
    const firstStillUsingButton = stillUsingButtons[0];
    expect(firstStillUsingButton).toBeDefined();
    if (firstStillUsingButton === undefined) return;
    fireEvent.click(firstStillUsingButton);

    expect(screen.queryByText("テストドレスA")).not.toBeInTheDocument();
    expect(screen.getByText("テストドレスB")).toBeInTheDocument();

    const lostButtons = screen.getAllByRole("button", { name: /なくした/ });
    const firstLostButton = lostButtons[0];
    expect(firstLostButton).toBeDefined();
    if (firstLostButton === undefined) return;
    fireEvent.click(firstLostButton);

    expect(
      screen.queryByText("取り出し中の服を確認", { exact: false }),
    ).not.toBeInTheDocument();
  });
});
