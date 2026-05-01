import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { testDb, FIXED_NOW } from "@/test/mocks/db";
import { seedDbFromTestDb } from "@/test/helpers/seedDb";
import { renderWithProviders } from "@/test/testUtils";
import DollEditPage from "./page";

const navMod = await vi.hoisted(
  async () => await import("@/test/mocks/modules/nextNavigation"),
);
const cuidMod = await vi.hoisted(
  async () => await import("@/test/mocks/modules/cuid2"),
);
const uploadMod = await vi.hoisted(
  async () => await import("@/test/mocks/modules/useImageUpload"),
);
vi.mock("next/navigation", navMod.nextNavigationFactory);
vi.mock("@paralleldrive/cuid2", cuidMod.cuid2Factory);
vi.mock("@/hooks/useImageUpload", uploadMod.useImageUploadFactory);

const navHandle: { current: ReturnType<typeof navMod.setupNextNavigation> } = {
  current: navMod.setupNextNavigation(),
};

const uploadHandle: {
  current: ReturnType<typeof uploadMod.setupUseImageUpload>;
} = {
  current: uploadMod.setupUseImageUpload(),
};

describe("DollEditPage", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
    navHandle.current = navMod.setupNextNavigation({
      params: { id: "doll-1" },
    });
    cuidMod.setupCuid2();
    uploadHandle.current = uploadMod.setupUseImageUpload();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("既存ドールのフィールドがフォームに反映される", async () => {
    testDb.doll.create({
      id: "doll-1",
      name: "リナ",
      bodySize: "MSD",
    });
    await seedDbFromTestDb();

    await renderWithProviders(<DollEditPage />);

    expect(screen.getByLabelText("名前")).toHaveValue("リナ");
    expect(screen.getByLabelText("ボディサイズ")).toHaveValue("MSD");
  });

  it("名前を変更して更新する", async () => {
    const user = userEvent.setup();
    testDb.doll.create({ id: "doll-1", name: "リナ" });
    await seedDbFromTestDb();

    await renderWithProviders(<DollEditPage />);

    const nameInput = screen.getByLabelText("名前");
    await user.clear(nameInput);
    await user.type(nameInput, "ミユ");
    await user.click(screen.getByRole("button", { name: "更新する" }));

    const { getDb } = await import("@/lib/db/dexie");
    const db = getDb();
    await waitFor(async () => {
      const doll = await db.dolls.get("doll-1");
      expect(doll?.name).toBe("ミユ");
    });
    await waitFor(() => {
      expect(navHandle.current.router.push).toHaveBeenCalledWith(
        "/dolls/doll-1",
      );
    });
  });

  it("存在しないドールの場合にメッセージを表示する", async () => {
    navHandle.current.setParams({ id: "non-existent" });

    await renderWithProviders(<DollEditPage />);

    expect(
      await screen.findByText("ドールが見つかりません"),
    ).toBeInTheDocument();
    expect(screen.getByText("一覧に戻る")).toBeInTheDocument();
  });
});
