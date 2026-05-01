import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getDb } from "@/lib/db/dexie";
import { testDb, FIXED_NOW } from "@/test/mocks/db";
import { seedDbFromTestDb } from "@/test/helpers/seedDb";
import { renderWithProviders } from "@/test/testUtils";
import CoordinateDetailPage from "./page";

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

const seedSampleCoordinate = async () => {
  testDb.garment.create({
    id: "g-1",
    name: "白ドレス",
    imageUrl: "https://example.com/white.png",
  });
  testDb.garment.create({ id: "g-2", name: "黒コート" });
  testDb.coordinate.create({
    id: "c-1",
    name: "春コーデ",
    garmentIds: ["g-1", "g-2"],
    memo: "桜のシーズン",
  });
  await seedDbFromTestDb();
};

describe("CoordinateDetailPage", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
    navHandle.current = navMod.setupNextNavigation({ params: { id: "c-1" } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("コーデが見つからない場合にメッセージを表示する", async () => {
    await renderWithProviders(<CoordinateDetailPage />);

    expect(
      await screen.findByText("コーデが見つかりません"),
    ).toBeInTheDocument();
  });

  it("詳細表示で名前・メモ・使用する服の画像が表示される", async () => {
    await seedSampleCoordinate();

    await renderWithProviders(<CoordinateDetailPage />);

    expect(
      await screen.findByRole("heading", { name: "春コーデ" }),
    ).toBeInTheDocument();
    expect(screen.getByText("桜のシーズン")).toBeInTheDocument();
    expect(screen.getByAltText("白ドレス")).toBeInTheDocument();
    expect(screen.getByText("黒コート")).toBeInTheDocument();
  });

  it("編集ボタンでフォームに切り替わり、保存で内容が更新される", async () => {
    const user = userEvent.setup();
    await seedSampleCoordinate();

    await renderWithProviders(<CoordinateDetailPage />);

    await user.click(await screen.findByRole("button", { name: "編集" }));

    const nameInput = await screen.findByLabelText("コーデ名");
    await user.clear(nameInput);
    await user.type(nameInput, "夏コーデ");
    await user.click(screen.getByRole("button", { name: "更新する" }));

    await waitFor(async () => {
      const updated = await getDb().coordinates.get("c-1");
      expect(updated?.name).toBe("夏コーデ");
    });
  });

  it("削除ボタンを確定するとレコードが消えて一覧に戻る", async () => {
    const user = userEvent.setup();
    await seedSampleCoordinate();

    await renderWithProviders(<CoordinateDetailPage />);

    await user.click(await screen.findByRole("button", { name: "削除" }));
    const confirmButtons = await screen.findAllByRole("button", {
      name: "削除",
    });
    const confirmButton = confirmButtons[confirmButtons.length - 1];
    expect(confirmButton).toBeDefined();
    if (confirmButton === undefined) return;
    await user.click(confirmButton);

    await waitFor(async () => {
      expect(await getDb().coordinates.get("c-1")).toBeUndefined();
    });
    expect(navHandle.current.router.push).toHaveBeenCalledWith("/coordinates");
  });
});
