import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MS_PER_DAY } from "@/lib/constants";
import { testDb, FIXED_NOW } from "@/test/mocks/db";
import { seedDbFromTestDb } from "@/test/helpers/seedDb";
import { renderWithProviders } from "@/test/testUtils";
import CheckedOutSection from "./CheckedOutSection";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("CheckedOutSection", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
    mockPush.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("取り出し中の服が 0 件の場合はセクションが表示されない", async () => {
    await renderWithProviders(<CheckedOutSection />);

    await waitFor(() => {
      expect(screen.queryByText("取り出し中の服")).not.toBeInTheDocument();
    });
  });

  it("3 日以上のアイテムには 3 択ボタンが表示される", async () => {
    testDb.garment.create({
      id: "g-1",
      name: "テストドレスA",
      status: "checked_out",
      checkedOutAt: FIXED_NOW - 5 * MS_PER_DAY,
    });
    await seedDbFromTestDb();

    await renderWithProviders(<CheckedOutSection />);

    expect(await screen.findByText("取り出し中の服")).toBeInTheDocument();
    expect(screen.getByText("テストドレスA")).toBeInTheDocument();
    expect(screen.getByText("5日前から取り出し中")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /しまった/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /使用中/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /紛失/ })).toBeInTheDocument();
  });

  it("3 日未満のアイテムはボタン非表示で名前と経過日数のみ表示される", async () => {
    testDb.garment.create({
      id: "g-1",
      name: "テストドレスA",
      status: "checked_out",
      checkedOutAt: FIXED_NOW - 1 * MS_PER_DAY,
    });
    await seedDbFromTestDb();

    await renderWithProviders(<CheckedOutSection />);

    expect(await screen.findByText("テストドレスA")).toBeInTheDocument();
    expect(screen.getByText("1日前から取り出し中")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /しまった/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /使用中/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /紛失/ }),
    ).not.toBeInTheDocument();
  });

  it("3 日以上と 3 日未満が混在する場合、3 日以上のみボタン付き", async () => {
    testDb.garment.create({
      id: "g-orphan",
      name: "オールドドレス",
      status: "checked_out",
      checkedOutAt: FIXED_NOW - 5 * MS_PER_DAY,
    });
    testDb.garment.create({
      id: "g-recent",
      name: "ニュードレス",
      status: "checked_out",
      checkedOutAt: FIXED_NOW - 1 * MS_PER_DAY,
    });
    await seedDbFromTestDb();

    await renderWithProviders(<CheckedOutSection />);

    expect(await screen.findByText("オールドドレス")).toBeInTheDocument();
    expect(screen.getByText("ニュードレス")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /しまった/ })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: /使用中/ })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: /紛失/ })).toHaveLength(1);
  });

  it("経過日数の降順でソートされる", async () => {
    testDb.garment.create({
      id: "g-1",
      name: "ドレスA",
      status: "checked_out",
      checkedOutAt: FIXED_NOW - 2 * MS_PER_DAY,
    });
    testDb.garment.create({
      id: "g-2",
      name: "ドレスB",
      status: "checked_out",
      checkedOutAt: FIXED_NOW - 10 * MS_PER_DAY,
    });
    testDb.garment.create({
      id: "g-3",
      name: "ドレスC",
      status: "checked_out",
      checkedOutAt: FIXED_NOW - 5 * MS_PER_DAY,
    });
    await seedDbFromTestDb();

    const { container } = await renderWithProviders(<CheckedOutSection />);

    await screen.findByText("ドレスA");
    const names = within(container)
      .getAllByText(/ドレス[ABC]/)
      .map((el) => el.textContent);
    expect(names).toEqual(["ドレスB", "ドレスC", "ドレスA"]);
  });

  it("「しまった」をクリックするとスキャン画面に遷移する", async () => {
    const user = userEvent.setup();
    testDb.garment.create({
      id: "g-1",
      name: "テストドレスA",
      status: "checked_out",
      checkedOutAt: FIXED_NOW - 5 * MS_PER_DAY,
    });
    await seedDbFromTestDb();

    await renderWithProviders(<CheckedOutSection />);

    const button = await screen.findByRole("button", { name: /しまった/ });
    await user.click(button);

    expect(mockPush).toHaveBeenCalledWith("/scan");
  });

  it("「使用中」をクリックすると checkedOutAt が更新され、ボタンが非表示になる", async () => {
    const user = userEvent.setup();
    testDb.garment.create({
      id: "g-1",
      name: "テストドレスA",
      status: "checked_out",
      checkedOutAt: FIXED_NOW - 5 * MS_PER_DAY,
    });
    await seedDbFromTestDb();

    await renderWithProviders(<CheckedOutSection />);

    const button = await screen.findByRole("button", { name: /使用中/ });
    await user.click(button);

    const { getDb } = await import("@/lib/db/dexie");
    const db = getDb();
    await waitFor(async () => {
      const g = await db.garments.get("g-1");
      expect(g?.checkedOutAt).toBeGreaterThan(FIXED_NOW - 5 * MS_PER_DAY);
    });

    const g = await db.garments.get("g-1");
    expect(g?.status).toBe("checked_out");

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /使用中/ }),
      ).not.toBeInTheDocument();
    });
    expect(screen.getByText("テストドレスA")).toBeInTheDocument();
  });

  it("「紛失」をクリックすると確認ダイアログが開く", async () => {
    const user = userEvent.setup();
    testDb.garment.create({
      id: "g-1",
      name: "テストドレスA",
      status: "checked_out",
      checkedOutAt: FIXED_NOW - 5 * MS_PER_DAY,
    });
    await seedDbFromTestDb();

    await renderWithProviders(<CheckedOutSection />);

    const button = await screen.findByRole("button", { name: /紛失$/ });
    await user.click(button);

    expect(
      await screen.findByText("紛失として記録しますか？"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/テストドレスA.*紛失としてマーク/),
    ).toBeInTheDocument();
  });

  it("紛失確認ダイアログで確定すると status = 'lost' になりアイテムがセクションから消える", async () => {
    const user = userEvent.setup();
    testDb.garment.create({
      id: "g-1",
      name: "テストドレスA",
      status: "checked_out",
      checkedOutAt: FIXED_NOW - 5 * MS_PER_DAY,
    });
    await seedDbFromTestDb();

    await renderWithProviders(<CheckedOutSection />);

    const lostButton = await screen.findByRole("button", { name: /紛失$/ });
    await user.click(lostButton);

    const confirmButton = await screen.findByRole("button", {
      name: "紛失として記録",
    });
    await user.click(confirmButton);

    const { getDb } = await import("@/lib/db/dexie");
    const db = getDb();
    await waitFor(async () => {
      const g = await db.garments.get("g-1");
      expect(g?.status).toBe("lost");
    });
    await waitFor(() => {
      expect(screen.queryByText("テストドレスA")).not.toBeInTheDocument();
    });
  });

  it("紛失確認ダイアログでキャンセルすると status が変わらずダイアログが閉じる", async () => {
    const user = userEvent.setup();
    testDb.garment.create({
      id: "g-1",
      name: "テストドレスA",
      status: "checked_out",
      checkedOutAt: FIXED_NOW - 5 * MS_PER_DAY,
    });
    await seedDbFromTestDb();

    await renderWithProviders(<CheckedOutSection />);

    const lostButton = await screen.findByRole("button", { name: /紛失$/ });
    await user.click(lostButton);

    const cancelButton = await screen.findByRole("button", {
      name: "キャンセル",
    });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(
        screen.queryByText("紛失として記録しますか？"),
      ).not.toBeInTheDocument();
    });

    const { getDb } = await import("@/lib/db/dexie");
    const db = getDb();
    const g = await db.garments.get("g-1");
    expect(g?.status).toBe("checked_out");
    expect(screen.getByText("テストドレスA")).toBeInTheDocument();
  });
});
