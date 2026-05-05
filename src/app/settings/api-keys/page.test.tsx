import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
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
});
