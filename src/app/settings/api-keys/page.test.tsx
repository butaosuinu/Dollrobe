import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { server } from "@/test/mocks/server";
import { unauthenticatedHandler } from "@/test/mocks/handlers";
import { renderWithProviders } from "@/test/testUtils";
import { setupAuthClient } from "@/test/mocks/modules/authClient";
import { setupNextNavigation } from "@/test/mocks/modules/nextNavigation";
import { installClipboard } from "@/test/helpers/clipboard";
import { API_KEY_SCOPE, type ApiKeySummary } from "@/lib/auth";
import ApiKeysPage from "./page";

const baseKey: ApiKeySummary = {
  id: "key-existing",
  name: "agent-existing",
  scope: API_KEY_SCOPE.READ_ONLY,
  createdAt: new Date("2026-01-01T00:00:00Z").getTime(),
  lastRequestAt: undefined,
  enabled: true,
};

describe("ApiKeysPage", () => {
  beforeEach(() => {
    setupNextNavigation();
  });

  it("既存の API キー一覧が表示される", async () => {
    setupAuthClient({ apiKeys: [baseKey] });

    await renderWithProviders(<ApiKeysPage />);

    expect(await screen.findByText("agent-existing")).toBeInTheDocument();
  });

  it("発行 → 一覧に追加 → 失効 → 一覧から消える、の一気通貫フロー", async () => {
    const { spies } = setupAuthClient({
      apiKeys: [],
      nextCreated: {
        id: "key-new",
        name: "agent-new",
        scope: API_KEY_SCOPE.READ_WRITE,
        createdAt: Date.now(),
        lastRequestAt: undefined,
        enabled: true,
        key: "dwk_secret_value",
      },
    });
    const user = userEvent.setup();
    installClipboard();

    await renderWithProviders(<ApiKeysPage />);

    // 初期状態: EmptyState
    expect(
      await screen.findByText("まだ API キーがありません"),
    ).toBeInTheDocument();

    // 発行ダイアログを開く
    await user.click(
      screen.getByRole("button", { name: "新しい API キーを発行" }),
    );

    // 名前入力 + scope=read-write 選択 + 発行
    await user.type(await screen.findByLabelText("名前"), "agent-new");
    await user.selectOptions(
      screen.getByLabelText("スコープ"),
      API_KEY_SCOPE.READ_WRITE,
    );
    await user.click(screen.getByRole("button", { name: "発行" }));

    // 生キー表示
    expect(await screen.findByTestId("api-key-value")).toHaveTextContent(
      "dwk_secret_value",
    );
    expect(spies.createApiKey).toHaveBeenCalledWith({
      name: "agent-new",
      scope: API_KEY_SCOPE.READ_WRITE,
    });

    // モーダルを閉じる → 一覧に出現
    await user.click(screen.getByRole("button", { name: "完了" }));
    expect(await screen.findByText("agent-new")).toBeInTheDocument();

    // 失効
    await user.click(screen.getByRole("button", { name: "失効" }));
    const confirmButtons = screen.getAllByRole("button", { name: "失効" });
    await user.click(confirmButtons[confirmButtons.length - 1]!);

    expect(spies.revokeApiKey).toHaveBeenCalledWith("key-new");
    await waitFor(() => {
      expect(screen.queryByText("agent-new")).toBeNull();
    });
  });

  it("未認証時は /signin へリダイレクトされる", async () => {
    server.use(unauthenticatedHandler);
    const { router } = setupNextNavigation();

    await renderWithProviders(<ApiKeysPage />);

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/signin");
    });
  });

  it("API キー発行に失敗するとシートが閉じず生キー表示も出ない", async () => {
    const { spies } = setupAuthClient({
      apiKeys: [],
      createShouldFail: true,
    });
    const user = userEvent.setup();
    await renderWithProviders(<ApiKeysPage />);

    await user.click(
      await screen.findByRole("button", { name: "新しい API キーを発行" }),
    );
    await user.type(await screen.findByLabelText("名前"), "agent-fail");
    await user.click(screen.getByRole("button", { name: "発行" }));

    await waitFor(() => {
      expect(spies.createApiKey).toHaveBeenCalled();
    });
    expect(screen.queryByTestId("api-key-value")).toBeNull();
  });

  it("名前が空のとき発行ボタンは無効化される", async () => {
    setupAuthClient({ apiKeys: [] });
    const user = userEvent.setup();
    await renderWithProviders(<ApiKeysPage />);

    await user.click(
      await screen.findByRole("button", { name: "新しい API キーを発行" }),
    );
    const submitBtn = await screen.findByRole("button", { name: "発行" });
    expect(submitBtn).toBeDisabled();
  });

  it("発行シートをキャンセルで閉じることができる", async () => {
    setupAuthClient({ apiKeys: [] });
    const user = userEvent.setup();
    await renderWithProviders(<ApiKeysPage />);

    await user.click(
      await screen.findByRole("button", { name: "新しい API キーを発行" }),
    );
    await user.type(await screen.findByLabelText("名前"), "tmp");
    await user.click(screen.getByRole("button", { name: "キャンセル" }));

    await waitFor(() => {
      expect(screen.queryByLabelText("名前")).toBeNull();
    });
  });

  it("最終使用済みの API キーは最終使用日時が表示される", async () => {
    const lastRequestAt = new Date("2026-02-15T10:00:00Z").getTime();
    setupAuthClient({
      apiKeys: [
        {
          ...baseKey,
          id: "key-used",
          name: "agent-used",
          lastRequestAt,
        },
      ],
    });

    await renderWithProviders(<ApiKeysPage />);

    expect(await screen.findByText("agent-used")).toBeInTheDocument();
    expect(screen.queryByText("未使用")).toBeNull();
    // ApiKeyList は ja locale で `yyyy/MM/dd HH:mm` パターンで描画する。
    // 環境ローカル TZ に左右されない年月部分 (2026/02) を assert することで
    // formatDateTime 経路が実際に呼ばれていることを確認する。
    const visibleDate = await screen.findByText(
      /2026\/02\/\d{2}\s+\d{2}:\d{2}/u,
    );
    expect(visibleDate).toBeInTheDocument();
  });

  it("失効処理が失敗した場合は一覧から消えない", async () => {
    setupAuthClient({
      apiKeys: [baseKey],
      revokeShouldFail: true,
    });
    const user = userEvent.setup();
    await renderWithProviders(<ApiKeysPage />);

    expect(await screen.findByText("agent-existing")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "失効" }));
    const confirmButtons = screen.getAllByRole("button", { name: "失効" });
    await user.click(confirmButtons[confirmButtons.length - 1]!);

    await waitFor(() => {
      expect(screen.getByText("agent-existing")).toBeInTheDocument();
    });
  });
});
