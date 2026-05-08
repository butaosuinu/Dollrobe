import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/mocks/server";
import { FIXED_NOW } from "@/test/mocks/db";
import { renderWithProviders } from "@/test/testUtils";
import { setupNextNavigation } from "@/test/mocks/modules/nextNavigation";
import { createDeferred } from "@/test/helpers/deferred";
import { createPngFile } from "@/test/helpers/files";
import { fireSingleFileSelect } from "@/test/helpers/fileInput";
import DollForm from "./DollForm";

const navHandle = setupNextNavigation();

describe("DollForm", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
    setupNextNavigation();
    server.use(
      http.post("*/api/images/upload/*", () =>
        HttpResponse.json({ imageUrl: "https://r2.example.com/test.png" }),
      ),
    );
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
      expect(dolls[0]?.id).toMatch(/^[a-z0-9]+$/);
      expect(dolls[0]?.bodySize).toBe("SD");
    });
    await waitFor(() => {
      expect(navHandle.router.push).toHaveBeenCalledWith("/dolls");
    });
  });

  it("アップロード中はボタンが disabled + テキスト変更", async () => {
    const upload = createDeferred<{ imageUrl: string }>();
    server.use(
      http.post("*/api/images/upload/*", async () => {
        const body = await upload.promise;
        return HttpResponse.json(body);
      }),
    );
    const user = userEvent.setup();
    await renderWithProviders(<DollForm />);

    const input =
      document.querySelector<HTMLInputElement>('input[type="file"]');
    if (input === null) return;
    fireSingleFileSelect(input, createPngFile());
    await user.type(screen.getByLabelText("名前"), "リナ");
    await user.click(screen.getByRole("button", { name: "登録する" }));

    expect(
      await screen.findByRole("button", { name: "アップロード中..." }),
    ).toBeDisabled();

    upload.resolve({ imageUrl: "https://example.com/x.png" });
    await waitFor(() => {
      expect(navHandle.router.push).toHaveBeenCalledWith("/dolls");
    });
  });
});
