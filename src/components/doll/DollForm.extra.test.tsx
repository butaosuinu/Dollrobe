import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/mocks/server";
import { FIXED_NOW } from "@/test/mocks/db";
import { renderWithProviders } from "@/test/testUtils";
import { createTestDoll } from "@/test/factories";
import { setupNextNavigation } from "@/test/mocks/modules/nextNavigation";
import { compressImage } from "@/lib/image/compressImage";
import DollForm from "./DollForm";

const navHandle = setupNextNavigation();

const EXISTING_IMAGE_URL = "https://cdn.example.com/existing.png";
const UPLOADED_IMAGE_URL = "https://cdn.example.com/uploaded.png";

const selectFileInput = (file: File): void => {
  const input = document.querySelector('input[type="file"]');
  expect(input).not.toBeNull();
  if (input == null) return;
  fireEvent.change(input, { target: { files: [file] } });
};

const createPngFile = (name = "new.png"): File =>
  new File(["dummy"], name, { type: "image/png" });

describe("DollForm (extra coverage)", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
    setupNextNavigation();
    server.use(
      http.post("*/api/images/upload/*", () =>
        HttpResponse.json({ imageUrl: UPLOADED_IMAGE_URL }),
      ),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("空白文字のみの名前では登録ボタンが disabled のまま", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<DollForm />);

    await user.type(screen.getByLabelText("名前"), "   ");

    expect(screen.getByRole("button", { name: "登録する" })).toBeDisabled();
  });

  it("maker / customizer / headModel を入力すると trim 済み値が保存される", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<DollForm />);

    await user.type(screen.getByLabelText("名前"), "リナ");
    await user.type(screen.getByLabelText("ヘッド型番"), "  DDH-01  ");
    await user.type(screen.getByLabelText("メーカー"), "  ボークス  ");
    await user.type(screen.getByLabelText("カスタマイザー"), "  カスタムA  ");
    await user.click(screen.getByRole("button", { name: "登録する" }));

    const { getDb } = await import("@/lib/db/dexie");
    const db = getDb();
    await waitFor(async () => {
      const dolls = await db.dolls.toArray();
      expect(dolls.length).toBe(1);
      expect(dolls[0]?.headModel).toBe("DDH-01");
      expect(dolls[0]?.maker).toBe("ボークス");
      expect(dolls[0]?.customizer).toBe("カスタムA");
    });
  });

  it("空白のみの maker / customizer / headModel / memo は undefined として保存される", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<DollForm />);

    await user.type(screen.getByLabelText("名前"), "リナ");
    await user.type(screen.getByLabelText("ヘッド型番"), "   ");
    await user.type(screen.getByLabelText("メーカー"), "   ");
    await user.type(screen.getByLabelText("カスタマイザー"), "   ");
    await user.type(screen.getByLabelText("メモ"), "   ");
    await user.click(screen.getByRole("button", { name: "登録する" }));

    const { getDb } = await import("@/lib/db/dexie");
    const db = getDb();
    await waitFor(async () => {
      const dolls = await db.dolls.toArray();
      expect(dolls.length).toBe(1);
      expect(dolls[0]?.headModel).toBeUndefined();
      expect(dolls[0]?.maker).toBeUndefined();
      expect(dolls[0]?.customizer).toBeUndefined();
      expect(dolls[0]?.memo).toBeUndefined();
    });
  });

  it("ボディサイズを切り替えると選択値が保存される", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<DollForm />);

    await user.type(screen.getByLabelText("名前"), "リナ");
    await user.selectOptions(screen.getByLabelText("ボディサイズ"), "MSD");
    await user.click(screen.getByRole("button", { name: "登録する" }));

    const { getDb } = await import("@/lib/db/dexie");
    const db = getDb();
    await waitFor(async () => {
      const dolls = await db.dolls.toArray();
      expect(dolls[0]?.bodySize).toBe("MSD");
    });
  });

  it("ボディサイズに不正な値が来た場合は元の値のまま", async () => {
    await renderWithProviders(<DollForm />);

    const select = screen.getByLabelText("ボディサイズ");
    fireEvent.change(select, { target: { value: "INVALID" } });

    expect(select).toHaveValue("SD");
  });

  it("編集モード: initial values がフォームにセットされ、ボタンが '更新する' に切り替わる", async () => {
    const doll = createTestDoll({
      id: "doll-edit-1",
      name: "既存ドール",
      headModel: "DDH-09",
      bodySize: "MSD",
      maker: "アゾン",
      customizer: "作者A",
      memo: "メモあり",
      imageUrl: EXISTING_IMAGE_URL,
    });

    await renderWithProviders(<DollForm doll={doll} />);

    expect(screen.getByLabelText("名前")).toHaveValue("既存ドール");
    expect(screen.getByLabelText("ヘッド型番")).toHaveValue("DDH-09");
    expect(screen.getByLabelText("メーカー")).toHaveValue("アゾン");
    expect(screen.getByLabelText("カスタマイザー")).toHaveValue("作者A");
    expect(screen.getByLabelText("メモ")).toHaveValue("メモあり");
    expect(screen.getByLabelText("ボディサイズ")).toHaveValue("MSD");
    expect(screen.getByAltText("プレビュー")).toHaveAttribute(
      "src",
      EXISTING_IMAGE_URL,
    );
    expect(
      screen.getByRole("button", { name: "更新する" }),
    ).toBeInTheDocument();
  });

  it("編集モード: 更新フローで Dexie が更新され詳細画面に遷移する", async () => {
    const doll = createTestDoll({
      id: "doll-edit-2",
      name: "旧名",
      bodySize: "SD",
    });

    const { getDb } = await import("@/lib/db/dexie");
    const db = getDb();
    await db.dolls.add(doll);

    const user = userEvent.setup();
    await renderWithProviders(<DollForm doll={doll} />);

    await user.clear(screen.getByLabelText("名前"));
    await user.type(screen.getByLabelText("名前"), "新名");
    await user.click(screen.getByRole("button", { name: "更新する" }));

    await waitFor(async () => {
      const updated = await db.dolls.get("doll-edit-2");
      expect(updated?.name).toBe("新名");
      expect(updated?.updatedAt).toBe(FIXED_NOW);
    });
    await waitFor(() => {
      expect(navHandle.router.push).toHaveBeenCalledWith("/dolls/doll-edit-2");
    });
  });

  it("編集モード: 画像未選択なら元の imageUrl がそのまま保持される", async () => {
    const uploadSpy = vi.fn();
    server.use(
      http.post("*/api/images/upload/*", () => {
        uploadSpy();
        return HttpResponse.json({ imageUrl: UPLOADED_IMAGE_URL });
      }),
    );
    const doll = createTestDoll({
      id: "doll-edit-3",
      name: "リナ",
      imageUrl: EXISTING_IMAGE_URL,
    });

    const { getDb } = await import("@/lib/db/dexie");
    const db = getDb();
    await db.dolls.add(doll);

    const user = userEvent.setup();
    await renderWithProviders(<DollForm doll={doll} />);

    await user.click(screen.getByRole("button", { name: "更新する" }));

    await waitFor(async () => {
      const updated = await db.dolls.get("doll-edit-3");
      expect(updated?.imageUrl).toBe(EXISTING_IMAGE_URL);
    });
    expect(uploadSpy).not.toHaveBeenCalled();
  });

  it("画像を新規選択するとプレビューが切り替わり upload が呼ばれる", async () => {
    const collected: string[] = [];
    server.use(
      http.post("*/api/images/upload/:id", ({ params }) => {
        collected.push(String(params.id));
        return HttpResponse.json({ imageUrl: UPLOADED_IMAGE_URL });
      }),
    );
    const doll = createTestDoll({
      id: "doll-edit-4",
      name: "リナ",
      imageUrl: EXISTING_IMAGE_URL,
    });

    const { getDb } = await import("@/lib/db/dexie");
    const db = getDb();
    await db.dolls.add(doll);

    await renderWithProviders(<DollForm doll={doll} />);

    expect(screen.getByAltText("プレビュー")).toHaveAttribute(
      "src",
      EXISTING_IMAGE_URL,
    );

    const file = createPngFile();
    selectFileInput(file);

    await waitFor(() => {
      expect(screen.getByAltText("プレビュー").getAttribute("src")).toContain(
        "blob:",
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "更新する" }));

    await waitFor(async () => {
      const updated = await db.dolls.get("doll-edit-4");
      expect(updated?.imageUrl).toBe(UPLOADED_IMAGE_URL);
    });
    expect(collected).toContain("doll-edit-4");
  });

  it("画像アップロードが失敗した場合は元の imageUrl が維持される", async () => {
    server.use(
      http.post(
        "*/api/images/upload/*",
        () => new HttpResponse(null, { status: 500 }),
      ),
    );
    const doll = createTestDoll({
      id: "doll-edit-5",
      name: "リナ",
      imageUrl: EXISTING_IMAGE_URL,
    });

    const { getDb } = await import("@/lib/db/dexie");
    const db = getDb();
    await db.dolls.add(doll);

    const user = userEvent.setup();
    await renderWithProviders(<DollForm doll={doll} />);

    const file = createPngFile();
    selectFileInput(file);

    await user.click(screen.getByRole("button", { name: "更新する" }));

    await waitFor(async () => {
      const updated = await db.dolls.get("doll-edit-5");
      expect(updated?.imageUrl).toBe(EXISTING_IMAGE_URL);
    });
  });

  it("新規登録時に画像を選択するとアップロード結果が保存される", async () => {
    const collected: string[] = [];
    server.use(
      http.post("*/api/images/upload/:id", ({ params }) => {
        collected.push(String(params.id));
        return HttpResponse.json({ imageUrl: UPLOADED_IMAGE_URL });
      }),
    );
    const user = userEvent.setup();
    await renderWithProviders(<DollForm />);

    await user.type(screen.getByLabelText("名前"), "リナ");

    const file = createPngFile();
    selectFileInput(file);

    await user.click(screen.getByRole("button", { name: "登録する" }));

    const { getDb } = await import("@/lib/db/dexie");
    const db = getDb();
    await waitFor(async () => {
      const dolls = await db.dolls.toArray();
      expect(dolls[0]?.imageUrl).toBe(UPLOADED_IMAGE_URL);
    });
    expect(collected.length).toBeGreaterThanOrEqual(1);
    expect(collected[0]).toMatch(/^[a-z0-9]+$/i);
  });

  it("新規登録 + 画像アップロード失敗時は imageUrl が undefined で保存される", async () => {
    server.use(
      http.post(
        "*/api/images/upload/*",
        () => new HttpResponse(null, { status: 500 }),
      ),
    );
    const user = userEvent.setup();
    await renderWithProviders(<DollForm />);

    await user.type(screen.getByLabelText("名前"), "リナ");

    const file = createPngFile();
    selectFileInput(file);

    await user.click(screen.getByRole("button", { name: "登録する" }));

    const { getDb } = await import("@/lib/db/dexie");
    const db = getDb();
    await waitFor(async () => {
      const dolls = await db.dolls.toArray();
      expect(dolls.length).toBe(1);
      expect(dolls[0]?.imageUrl).toBeUndefined();
    });
  });

  it("圧縮中は送信が抑止される (handleSubmit 早期 return)", async () => {
    type CompressResult = { file: File; width: number; height: number };
    const release: { fn: (value: CompressResult) => void } = {
      fn: () => undefined,
    };
    const compressGate = new Promise<CompressResult>((resolve) => {
      release.fn = resolve;
    });
    vi.mocked(compressImage).mockImplementationOnce(
      async () => await compressGate,
    );
    const uploadSpy = vi.fn();
    server.use(
      http.post("*/api/images/upload/*", () => {
        uploadSpy();
        return HttpResponse.json({ imageUrl: UPLOADED_IMAGE_URL });
      }),
    );
    const user = userEvent.setup();
    await renderWithProviders(<DollForm />);

    await user.type(screen.getByLabelText("名前"), "リナ");
    const file = createPngFile();
    selectFileInput(file);
    // 1 回目の送信で「圧縮中」状態に入る
    await user.click(screen.getByRole("button", { name: "登録する" }));

    const button = await screen.findByRole("button", {
      name: "アップロード中...",
    });
    expect(button).toBeDisabled();

    // disabled ボタンを経由しない経路（Enter キー等）でも submit が抑止されることを
    // 検証するため、フォームの submit イベントを直接発火させる。
    const form = button.closest("form");
    expect(form).not.toBeNull();
    if (form == null) return;
    fireEvent.submit(form);

    // 一定時間待っても upload が呼ばれていないことを確認
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(uploadSpy).not.toHaveBeenCalled();

    // gate を解放してテスト後の dangling Promise を解決
    release.fn({ file, width: 100, height: 100 });
    await waitFor(() => {
      expect(navHandle.router.push).toHaveBeenCalledWith("/dolls");
    });
  });
});
