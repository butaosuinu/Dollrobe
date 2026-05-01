import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { testDb, FIXED_NOW } from "@/test/mocks/db";
import { seedDbFromTestDb } from "@/test/helpers/seedDb";
import { renderWithProviders } from "@/test/testUtils";
import CoordinatesPage from "./page";

const navMod = await vi.hoisted(
  async () => await import("@/test/mocks/modules/nextNavigation"),
);
const linkMod = await vi.hoisted(
  async () => await import("@/test/mocks/modules/nextLink"),
);
vi.mock("next/navigation", navMod.nextNavigationFactory);
vi.mock("next/link", linkMod.nextLinkFactory);

const navHandle: { current: ReturnType<typeof navMod.setupNextNavigation> } = {
  current: navMod.setupNextNavigation(),
};

describe("CoordinatesPage", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
    navHandle.current = navMod.setupNextNavigation();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("コーデがない場合に空状態を表示する", async () => {
    await renderWithProviders(<CoordinatesPage />);

    expect(
      await screen.findByText("まだコーデがありません"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "コーデを作る" }),
    ).toBeInTheDocument();
  });

  it("空状態のCTAクリックで新規作成ページに遷移する", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<CoordinatesPage />);

    await user.click(
      await screen.findByRole("button", { name: "コーデを作る" }),
    );
    expect(navHandle.current.router.push).toHaveBeenCalledWith(
      "/coordinates/new",
    );
  });

  it("コーデ一覧を新しい順で表示する", async () => {
    testDb.garment.create({ id: "g-1", name: "白ドレス" });
    testDb.coordinate.create({
      id: "c-old",
      name: "古いコーデ",
      garmentIds: ["g-1"],
      createdAt: FIXED_NOW - 1000,
    });
    testDb.coordinate.create({
      id: "c-new",
      name: "新しいコーデ",
      garmentIds: ["g-1"],
      createdAt: FIXED_NOW,
    });
    await seedDbFromTestDb();

    await renderWithProviders(<CoordinatesPage />);

    await screen.findByText("新しいコーデ");
    const names = screen
      .getAllByText(/^.{2,}コーデ$/)
      .map((el) => el.textContent);
    expect(names).toEqual(["新しいコーデ", "古いコーデ"]);
  });

  it("手動とAIのコーデが出自バッジ付きで表示される", async () => {
    testDb.coordinate.create({
      id: "c-1",
      name: "手動コーデ",
      isAiGenerated: false,
    });
    testDb.coordinate.create({
      id: "c-2",
      name: "AIコーデ",
      isAiGenerated: true,
    });
    await seedDbFromTestDb();

    await renderWithProviders(<CoordinatesPage />);

    expect(await screen.findByText("手動コーデ")).toBeInTheDocument();
    expect(screen.getByText("AIコーデ")).toBeInTheDocument();
    expect(screen.getByText("手動")).toBeInTheDocument();
    expect(screen.getByText("AI")).toBeInTheDocument();
  });

  it("使用する服のサムネイルが表示される", async () => {
    testDb.garment.create({
      id: "g-1",
      name: "ピンクドレス",
      imageUrl: "https://example.com/pink.png",
    });
    testDb.coordinate.create({
      id: "c-1",
      name: "桜コーデ",
      garmentIds: ["g-1"],
    });
    await seedDbFromTestDb();

    await renderWithProviders(<CoordinatesPage />);

    expect(await screen.findByAltText("ピンクドレス")).toBeInTheDocument();
  });
});
