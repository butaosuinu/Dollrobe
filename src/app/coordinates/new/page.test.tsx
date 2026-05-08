import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getDb } from "@/lib/db/dexie";
import { testDb, FIXED_NOW } from "@/test/mocks/db";
import { seedDbFromTestDb } from "@/test/helpers/seedDb";
import { setupNextNavigation } from "@/test/mocks/modules/nextNavigation";
import { renderWithProviders } from "@/test/testUtils";
import NewCoordinatePage from "./page";

const navHandle: { current: ReturnType<typeof setupNextNavigation> } = {
  current: setupNextNavigation(),
};

describe("NewCoordinatePage", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
    navHandle.current = setupNextNavigation();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("服未選択・名前空のとき保存ボタンが無効", async () => {
    testDb.garment.create({ id: "g-1", name: "白ドレス" });
    await seedDbFromTestDb();

    await renderWithProviders(<NewCoordinatePage />);

    expect(
      await screen.findByRole("button", { name: "保存する" }),
    ).toBeDisabled();
  });

  it("服を選択して名前を入れて保存できる", async () => {
    const user = userEvent.setup();
    testDb.garment.create({ id: "g-1", name: "白ドレス" });
    testDb.garment.create({ id: "g-2", name: "黒コート" });
    await seedDbFromTestDb();

    await renderWithProviders(<NewCoordinatePage />);

    await user.click(
      await screen.findByRole("button", { name: /白ドレス/, pressed: false }),
    );
    await user.click(
      screen.getByRole("button", { name: /黒コート/, pressed: false }),
    );
    await user.type(screen.getByLabelText("コーデ名"), "お出かけ");
    await user.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(navHandle.current.router.push).toHaveBeenCalledWith(
        "/coordinates",
      );
    });
    const saved = await getDb().coordinates.toArray();
    expect(saved).toHaveLength(1);
    expect(saved[0]?.id).toMatch(/^[a-z0-9]+$/);
    expect(saved[0]).toMatchObject({
      name: "お出かけ",
      garmentIds: ["g-1", "g-2"],
      isAiGenerated: false,
      memo: undefined,
    });
  });

  it("服の選択順が garmentIds の順序として保存される", async () => {
    const user = userEvent.setup();
    testDb.garment.create({ id: "g-1", name: "服A" });
    testDb.garment.create({ id: "g-2", name: "服B" });
    testDb.garment.create({ id: "g-3", name: "服C" });
    await seedDbFromTestDb();

    await renderWithProviders(<NewCoordinatePage />);

    await user.click(
      await screen.findByRole("button", { name: /服B/, pressed: false }),
    );
    await user.click(
      screen.getByRole("button", { name: /服A/, pressed: false }),
    );
    await user.click(
      screen.getByRole("button", { name: /服C/, pressed: false }),
    );
    await user.type(screen.getByLabelText("コーデ名"), "順序テスト");
    await user.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(navHandle.current.router.push).toHaveBeenCalledWith(
        "/coordinates",
      );
    });
    const saved = await getDb().coordinates.toArray();
    expect(saved[0]?.garmentIds).toEqual(["g-2", "g-1", "g-3"]);
  });

  it("メモも一緒に保存できる", async () => {
    const user = userEvent.setup();
    testDb.garment.create({ id: "g-1", name: "白ドレス" });
    await seedDbFromTestDb();

    await renderWithProviders(<NewCoordinatePage />);

    await user.click(
      await screen.findByRole("button", { name: /白ドレス/, pressed: false }),
    );
    await user.type(screen.getByLabelText("コーデ名"), "春");
    await user.type(screen.getByLabelText("メモ"), "桜のシーズン用");
    await user.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(navHandle.current.router.push).toHaveBeenCalledWith(
        "/coordinates",
      );
    });
    const saved = await getDb().coordinates.toArray();
    expect(saved[0]?.memo).toBe("桜のシーズン用");
  });
});
