import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { MS_PER_DAY } from "@/lib/constants";
import { testDb, FIXED_NOW } from "@/test/mocks/db";
import { seedDbFromTestDb } from "@/test/helpers/seedDb";
import { renderWithProviders } from "@/test/testUtils";
import OrphanCheckoutDialog from "./OrphanCheckoutDialog";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("OrphanCheckoutDialog", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
    mockPush.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("孤立アイテムがない場合はダイアログが表示されない", async () => {
    await renderWithProviders(<OrphanCheckoutDialog />);

    await waitFor(() => {
      expect(
        screen.queryByText("取り出し中の服を確認", { exact: false }),
      ).not.toBeInTheDocument();
    });
  });

  it("孤立アイテムの名前と経過日数が表示される", async () => {
    testDb.garment.create({
      id: "g-1",
      name: "テストドレスA",
      status: "checked_out",
      checkedOutAt: FIXED_NOW - 5 * MS_PER_DAY,
    });
    testDb.garment.create({
      id: "g-2",
      name: "テストドレスB",
      status: "checked_out",
      checkedOutAt: FIXED_NOW - 10 * MS_PER_DAY,
    });
    await seedDbFromTestDb();

    await renderWithProviders(<OrphanCheckoutDialog />);

    expect(await screen.findByText("テストドレスA")).toBeInTheDocument();
    expect(screen.getByText("テストドレスB")).toBeInTheDocument();
    expect(screen.getByText("5日前から取り出し中")).toBeInTheDocument();
    expect(screen.getByText("10日前から取り出し中")).toBeInTheDocument();
    expect(screen.getByText("取り出し中の服を確認（2件）")).toBeInTheDocument();
  });

  it("「まだ使用中」をクリックするとcheckedOutAtが更新されリストから消える", async () => {
    testDb.garment.create({
      id: "g-1",
      name: "テストドレスA",
      status: "checked_out",
      checkedOutAt: FIXED_NOW - 5 * MS_PER_DAY,
    });
    await seedDbFromTestDb();

    await renderWithProviders(<OrphanCheckoutDialog />);

    const stillUsingButton = await screen.findByRole("button", {
      name: /まだ使用中/,
    });
    fireEvent.click(stillUsingButton);

    await waitFor(async () => {
      const { db } = await import("@/lib/db/dexie");
      const g = await db.garments.get("g-1");
      expect(g?.checkedOutAt).toBeGreaterThan(FIXED_NOW - 5 * MS_PER_DAY);
    });
    await waitFor(() => {
      expect(screen.queryByText("テストドレスA")).not.toBeInTheDocument();
    });
  });

  it("「なくした」をクリックするとstatusがlostに更新されリストから消える", async () => {
    testDb.garment.create({
      id: "g-1",
      name: "テストドレスA",
      status: "checked_out",
      checkedOutAt: FIXED_NOW - 5 * MS_PER_DAY,
    });
    await seedDbFromTestDb();

    await renderWithProviders(<OrphanCheckoutDialog />);

    const lostButton = await screen.findByRole("button", { name: /なくした/ });
    fireEvent.click(lostButton);

    await waitFor(async () => {
      const { db } = await import("@/lib/db/dexie");
      const g = await db.garments.get("g-1");
      expect(g?.status).toBe("lost");
    });
    await waitFor(() => {
      expect(screen.queryByText("テストドレスA")).not.toBeInTheDocument();
    });
  });

  it("「しまった」をクリックするとスキャン画面に遷移する", async () => {
    testDb.garment.create({
      id: "g-1",
      name: "テストドレスA",
      status: "checked_out",
      checkedOutAt: FIXED_NOW - 5 * MS_PER_DAY,
    });
    await seedDbFromTestDb();

    await renderWithProviders(<OrphanCheckoutDialog />);

    const storedBackButton = await screen.findByRole("button", {
      name: /しまった/,
    });
    fireEvent.click(storedBackButton);

    expect(mockPush).toHaveBeenCalledWith("/scan");
  });

  it("全件解決するとダイアログが自動クローズする", async () => {
    testDb.garment.create({
      id: "g-1",
      name: "テストドレスA",
      status: "checked_out",
      checkedOutAt: FIXED_NOW - 5 * MS_PER_DAY,
    });
    testDb.garment.create({
      id: "g-2",
      name: "テストドレスB",
      status: "checked_out",
      checkedOutAt: FIXED_NOW - 7 * MS_PER_DAY,
    });
    await seedDbFromTestDb();

    await renderWithProviders(<OrphanCheckoutDialog />);

    expect(await screen.findByText("テストドレスA")).toBeInTheDocument();
    expect(screen.getByText("テストドレスB")).toBeInTheDocument();

    const stillUsingButtons = screen.getAllByRole("button", {
      name: /まだ使用中/,
    });
    const firstStillUsingButton = stillUsingButtons[0];
    expect(firstStillUsingButton).toBeDefined();
    if (firstStillUsingButton === undefined) return;
    fireEvent.click(firstStillUsingButton);

    await waitFor(() => {
      expect(screen.queryByText("テストドレスA")).not.toBeInTheDocument();
    });
    expect(screen.getByText("テストドレスB")).toBeInTheDocument();

    const lostButtons = screen.getAllByRole("button", { name: /なくした/ });
    const firstLostButton = lostButtons[0];
    expect(firstLostButton).toBeDefined();
    if (firstLostButton === undefined) return;
    fireEvent.click(firstLostButton);

    await waitFor(() => {
      expect(
        screen.queryByText("取り出し中の服を確認", { exact: false }),
      ).not.toBeInTheDocument();
    });
  });
});
