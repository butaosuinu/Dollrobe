import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { testDb, FIXED_NOW } from "@/test/mocks/db";
import { seedDbFromTestDb } from "@/test/helpers/seedDb";
import { setupCuid2 } from "@/test/mocks/modules/cuid2";
import { setupNextNavigation } from "@/test/mocks/modules/nextNavigation";
import { setupUseImageUpload } from "@/test/mocks/modules/useImageUpload";
import { renderWithProviders } from "@/test/testUtils";
import GarmentEditPage from "./page";

const navHandle: { current: ReturnType<typeof setupNextNavigation> } = {
  current: setupNextNavigation(),
};

const uploadHandle: {
  current: ReturnType<typeof setupUseImageUpload>;
} = {
  current: setupUseImageUpload(),
};

describe("GarmentEditPage", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
    navHandle.current = setupNextNavigation({
      params: { id: "garment-1" },
    });
    setupCuid2();
    uploadHandle.current = setupUseImageUpload();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ページタイトル「服を編集」が表示される", async () => {
    testDb.garment.create({ id: "garment-1" });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentEditPage />);

    expect(
      screen.getByRole("heading", { name: "服を編集" }),
    ).toBeInTheDocument();
  });

  it("既存の服データがフォームに初期値として入力されている", async () => {
    testDb.garment.create({
      id: "garment-1",
      name: "白いドレス",
      category: "dress",
      dollSizes: ["MSD"],
      brand: "ボークス",
    });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentEditPage />);

    expect(screen.getByLabelText("名前")).toHaveValue("白いドレス");
    expect(screen.getByLabelText("カテゴリ")).toHaveValue("dress");
    expect(screen.getByLabelText("ブランド/メーカー")).toHaveValue("ボークス");
  });

  it("更新ボタンが表示される（登録するではなく）", async () => {
    testDb.garment.create({ id: "garment-1" });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentEditPage />);

    expect(
      screen.getByRole("button", { name: "更新する" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "登録する" }),
    ).not.toBeInTheDocument();
  });

  it("存在しない服の場合にメッセージを表示する", async () => {
    navHandle.current.setParams({ id: "non-existent" });

    await renderWithProviders(<GarmentEditPage />);

    expect(await screen.findByText("服が見つかりません")).toBeInTheDocument();
    expect(screen.getByText("一覧に戻る")).toBeInTheDocument();
  });

  it("「一覧に戻る」クリックで /garments にナビゲーションする", async () => {
    const user = userEvent.setup();
    navHandle.current.setParams({ id: "non-existent" });

    await renderWithProviders(<GarmentEditPage />);

    await user.click(await screen.findByText("一覧に戻る"));

    expect(navHandle.current.router.push).toHaveBeenCalledWith("/garments");
  });

  it("戻るボタンで router.back() が呼ばれる", async () => {
    const user = userEvent.setup();
    testDb.garment.create({ id: "garment-1" });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentEditPage />);

    await user.click(screen.getByRole("button", { name: "戻る" }));

    expect(navHandle.current.router.back).toHaveBeenCalledTimes(1);
  });

  it("名前を変更して送信するとDexieの服が更新される", async () => {
    const user = userEvent.setup();
    testDb.garment.create({ id: "garment-1", name: "白いドレス" });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentEditPage />);

    const nameInput = screen.getByLabelText("名前");
    await user.clear(nameInput);
    await user.type(nameInput, "赤いドレス");
    await user.click(screen.getByRole("button", { name: "更新する" }));

    const { getDb } = await import("@/lib/db/dexie");
    const db = getDb();
    await waitFor(async () => {
      const garment = await db.garments.get("garment-1");
      expect(garment?.name).toBe("赤いドレス");
    });
  });

  it("送信後に詳細ページにナビゲーションする", async () => {
    const user = userEvent.setup();
    testDb.garment.create({ id: "garment-1", name: "白いドレス" });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentEditPage />);

    await user.click(screen.getByRole("button", { name: "更新する" }));

    await waitFor(() => {
      expect(navHandle.current.router.push).toHaveBeenCalledWith(
        "/garments/garment-1",
      );
    });
  });

  it("カテゴリを変更して送信すると反映される", async () => {
    const user = userEvent.setup();
    testDb.garment.create({ id: "garment-1", category: "dress" });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentEditPage />);

    await user.selectOptions(screen.getByLabelText("カテゴリ"), "tops");
    await user.click(screen.getByRole("button", { name: "更新する" }));

    const { getDb } = await import("@/lib/db/dexie");
    const db = getDb();
    await waitFor(async () => {
      const garment = await db.garments.get("garment-1");
      expect(garment?.category).toBe("tops");
    });
  });

  it("編集時に元の id, userId, status, locationId が保持される", async () => {
    const user = userEvent.setup();
    testDb.garment.create({
      id: "garment-1",
      userId: "user-1",
      status: "stored",
      locationId: "loc-1",
    });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentEditPage />);

    await user.click(screen.getByRole("button", { name: "更新する" }));

    const { getDb } = await import("@/lib/db/dexie");
    const db = getDb();
    await waitFor(async () => {
      const garment = await db.garments.get("garment-1");
      expect(garment?.id).toBe("garment-1");
      expect(garment?.userId).toBe("user-1");
      expect(garment?.status).toBe("stored");
      expect(garment?.locationId).toBe("loc-1");
    });
  });

  it("addGarmentAtom は呼ばれない（更新のみ実行される）", async () => {
    const user = userEvent.setup();
    testDb.garment.create({ id: "garment-1", name: "白いドレス" });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentEditPage />);

    await user.click(screen.getByRole("button", { name: "更新する" }));

    const { getDb } = await import("@/lib/db/dexie");
    const db = getDb();
    await waitFor(async () => {
      const garments = await db.garments.toArray();
      expect(garments.length).toBe(1);
      expect(garments[0]?.id).toBe("garment-1");
    });
  });

  it("名前を空にすると更新ボタンがdisabledになる", async () => {
    const user = userEvent.setup();
    testDb.garment.create({ id: "garment-1", name: "白いドレス" });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentEditPage />);

    await user.clear(screen.getByLabelText("名前"));

    expect(screen.getByRole("button", { name: "更新する" })).toBeDisabled();
  });

  it("アップロード中はボタンが disabled になる", async () => {
    uploadHandle.current.setUploadState({ status: "uploading" });
    testDb.garment.create({ id: "garment-1" });
    await seedDbFromTestDb();

    await renderWithProviders(<GarmentEditPage />);

    expect(
      screen.getByRole("button", { name: "アップロード中..." }),
    ).toBeDisabled();
  });
});
