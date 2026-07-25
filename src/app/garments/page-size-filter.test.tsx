import { describe, it, expect, vi, aroundEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { testDb, FIXED_NOW } from "@/test/mocks/db";
import { seedDbFromTestDb } from "@/test/helpers/seedDb";
import { setupNextNavigation } from "@/test/mocks/modules/nextNavigation";
import { renderWithProviders } from "@/test/testUtils";
import GarmentsPage from "./page";

const openFilterPanel = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: /フィルター/ }));
};

describe("GarmentsPage サイズフィルター", () => {
  aroundEach(async (runTest) => {
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
    setupNextNavigation();

    await runTest();

    vi.restoreAllMocks();
  });

  it("サイズフィルターで服を絞り込める", async () => {
    const user = userEvent.setup();
    testDb.garment.create({
      id: "g-1",
      name: "SD用ドレス",
      dollSizes: ["SD"],
    });
    testDb.garment.create({
      id: "g-2",
      name: "MSD用コート",
      dollSizes: ["MSD"],
    });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentsPage />);

    await openFilterPanel(user);
    await user.click(screen.getByRole("button", { name: /^MSD \(~43cm\)$/ }));

    expect(screen.getByText("MSD用コート")).toBeInTheDocument();
    expect(screen.queryByText("SD用ドレス")).not.toBeInTheDocument();
  });

  it("「すべて」選択でサイズフィルターを解除できる", async () => {
    const user = userEvent.setup();
    testDb.garment.create({
      id: "g-1",
      name: "SD用ドレス",
      dollSizes: ["SD"],
    });
    testDb.garment.create({
      id: "g-2",
      name: "MSD用コート",
      dollSizes: ["MSD"],
    });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentsPage />);

    await openFilterPanel(user);
    await user.click(screen.getByRole("button", { name: /^MSD \(~43cm\)$/ }));
    expect(screen.queryByText("SD用ドレス")).not.toBeInTheDocument();

    const sizeAllButton = screen.getAllByRole("button", { name: "すべて" })[2];
    expect(sizeAllButton).toBeDefined();
    if (sizeAllButton === undefined) return;
    await user.click(sizeAllButton);
    expect(screen.getByText("SD用ドレス")).toBeInTheDocument();
  });

  it("複数サイズを持つ服はどちらのサイズでもヒットする", async () => {
    const user = userEvent.setup();
    testDb.garment.create({
      id: "g-1",
      name: "SD/MSD兼用ドレス",
      dollSizes: ["SD", "MSD"],
    });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentsPage />);

    await openFilterPanel(user);
    await user.click(screen.getByRole("button", { name: /^SD \(~57cm\)$/ }));
    expect(screen.getByText("SD/MSD兼用ドレス")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^MSD \(~43cm\)$/ }));
    expect(screen.getByText("SD/MSD兼用ドレス")).toBeInTheDocument();
  });

  it("サイズ選択がアクティブフィルター数に含まれる", async () => {
    const user = userEvent.setup();
    testDb.garment.create({
      id: "g-1",
      name: "SD用ドレス",
      dollSizes: ["SD"],
    });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentsPage />);

    await openFilterPanel(user);
    await user.click(screen.getByRole("button", { name: /^SD \(~57cm\)$/ }));

    const filterButton = screen.getByRole("button", { name: /フィルター/ });
    expect(filterButton).toHaveTextContent("1");
  });
});
