import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { renderWithProviders } from "@/test/testUtils";
import { setupAuthClient } from "@/test/mocks/modules/authClient";
import { API_KEY_SCOPE, type ApiKeySummary } from "@/lib/auth";
import ApiKeyList from "./ApiKeyList";

const baseKey: ApiKeySummary = {
  id: "key-1",
  name: "agent-1",
  scope: API_KEY_SCOPE.READ_ONLY,
  createdAt: new Date("2026-01-01T10:00:00Z").getTime(),
  lastRequestAt: undefined,
  enabled: true,
};

describe("ApiKeyList", () => {
  beforeEach(() => {
    setupAuthClient();
  });

  it("API キーが 0 件の場合は EmptyState が表示される", async () => {
    setupAuthClient({ apiKeys: [] });
    await renderWithProviders(<ApiKeyList />);

    expect(
      await screen.findByText("まだ API キーがありません"),
    ).toBeInTheDocument();
  });

  it("API キーの一覧（名前 / スコープ / 日時）が表示される", async () => {
    setupAuthClient({
      apiKeys: [
        { ...baseKey, name: "agent-1", scope: API_KEY_SCOPE.READ_ONLY },
        {
          ...baseKey,
          id: "key-2",
          name: "agent-2",
          scope: API_KEY_SCOPE.READ_WRITE,
          lastRequestAt: new Date("2026-01-02T10:00:00Z").getTime(),
        },
      ],
    });
    await renderWithProviders(<ApiKeyList />);

    expect(await screen.findByText("agent-1")).toBeInTheDocument();
    expect(screen.getByText("agent-2")).toBeInTheDocument();
    expect(screen.getByText("read-only")).toBeInTheDocument();
    expect(screen.getByText("read-write")).toBeInTheDocument();
    expect(screen.getByText("未使用")).toBeInTheDocument();
  });

  it("失効ボタン → 確認 → revokeApiKey が呼ばれる", async () => {
    const { spies } = setupAuthClient({
      apiKeys: [{ ...baseKey, name: "agent-1" }],
    });
    const user = userEvent.setup();
    await renderWithProviders(<ApiKeyList />);

    await user.click(await screen.findByRole("button", { name: "失効" }));

    const confirmButtons = screen.getAllByRole("button", { name: "失効" });
    await user.click(confirmButtons[confirmButtons.length - 1]!);

    expect(spies.revokeApiKey).toHaveBeenCalledWith("key-1");
  });
});
