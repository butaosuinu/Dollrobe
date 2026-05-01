import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FIXED_NOW } from "@/test/mocks/db";
import { renderWithProviders } from "@/test/testUtils";
import DollForm from "./DollForm";

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

const navHandle = navMod.setupNextNavigation();

const uploadHandle: {
  current: ReturnType<typeof uploadMod.setupUseImageUpload>;
} = {
  current: uploadMod.setupUseImageUpload(),
};

describe("DollForm", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
    navMod.setupNextNavigation();
    cuidMod.setupCuid2({ id: "test-cuid" });
    uploadHandle.current = uploadMod.setupUseImageUpload();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("フォームの各フィールドが表示される", async () => {
    await renderWithProviders(<DollForm />);

    expect(screen.getByLabelText("名前")).toBeInTheDocument();
    expect(screen.getByLabelText("ヘッド型番")).toBeInTheDocument();
    expect(screen.getByLabelText("ボディサイズ")).toBeInTheDocument();
    expect(screen.getByLabelText("メモ")).toBeInTheDocument();
    expect(screen.getByText("写真を追加")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "登録する" }),
    ).toBeInTheDocument();
  });

  it("名前が空の場合は登録ボタンがdisabledになる", async () => {
    await renderWithProviders(<DollForm />);

    expect(screen.getByRole("button", { name: "登録する" })).toBeDisabled();
  });

  it("名前を入力すると登録ボタンがenabledになる", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<DollForm />);

    await user.type(screen.getByLabelText("名前"), "リナ");

    expect(screen.getByRole("button", { name: "登録する" })).toBeEnabled();
  });

  it("登録フロー: 名前入力→送信→Dexieに保存+ナビゲーション", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<DollForm />);

    await user.type(screen.getByLabelText("名前"), "リナ");
    await user.click(screen.getByRole("button", { name: "登録する" }));

    const { getDb } = await import("@/lib/db/dexie");
    const db = getDb();
    await waitFor(async () => {
      const dolls = await db.dolls.toArray();
      expect(dolls.length).toBe(1);
      expect(dolls[0]?.name).toBe("リナ");
      expect(dolls[0]?.id).toBe("test-cuid");
      expect(dolls[0]?.bodySize).toBe("SD");
    });
    await waitFor(() => {
      expect(navHandle.router.push).toHaveBeenCalledWith("/dolls");
    });
  });

  it("アップロード中はボタンが disabled + テキスト変更", async () => {
    uploadHandle.current.setUploadState({ status: "uploading" });
    await renderWithProviders(<DollForm />);

    expect(
      screen.getByRole("button", { name: "アップロード中..." }),
    ).toBeDisabled();
  });
});
