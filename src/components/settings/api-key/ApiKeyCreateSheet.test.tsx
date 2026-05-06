import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { renderWithProviders } from "@/test/testUtils";
import { setupAuthClient } from "@/test/mocks/modules/authClient";
import { API_KEY_SCOPE, type CreatedApiKey } from "@/lib/auth";
import ApiKeyCreateSheet from "./ApiKeyCreateSheet";

const fixedCreated: CreatedApiKey = {
  id: "key-new",
  name: "agent-x",
  scope: API_KEY_SCOPE.READ_ONLY,
  createdAt: 1_700_000_000_000,
  lastRequestAt: undefined,
  enabled: true,
  key: "dwk_test_abcdef",
};

describe("ApiKeyCreateSheet", () => {
  beforeEach(() => {
    setupAuthClient({ nextCreated: fixedCreated });
  });

  it("isOpen=false のとき発行ボタンは表示されない", async () => {
    const onCreated = vi.fn();
    const onClose = vi.fn();
    await renderWithProviders(
      <ApiKeyCreateSheet
        isOpen={false}
        onClose={onClose}
        onCreated={onCreated}
      />,
    );

    expect(screen.queryByRole("button", { name: "発行" })).toBeNull();
  });

  it("名前が空欄のとき発行ボタンは disabled", async () => {
    const onCreated = vi.fn();
    const onClose = vi.fn();
    await renderWithProviders(
      <ApiKeyCreateSheet
        isOpen={true}
        onClose={onClose}
        onCreated={onCreated}
      />,
    );

    const submitButton = await screen.findByRole("button", { name: "発行" });
    expect(submitButton).toBeDisabled();
  });

  it("名前 + scope=read-write で発行 → createApiKey が呼ばれ onCreated が生キー付きで実行される", async () => {
    const { spies } = setupAuthClient({
      nextCreated: { ...fixedCreated, scope: API_KEY_SCOPE.READ_WRITE },
    });
    const onCreated = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();

    await renderWithProviders(
      <ApiKeyCreateSheet
        isOpen={true}
        onClose={onClose}
        onCreated={onCreated}
      />,
    );

    await user.type(await screen.findByLabelText("名前"), "agent-x");
    await user.selectOptions(
      screen.getByLabelText("スコープ"),
      API_KEY_SCOPE.READ_WRITE,
    );
    await user.click(screen.getByRole("button", { name: "発行" }));

    expect(spies.createApiKey).toHaveBeenCalledWith({
      name: "agent-x",
      scope: API_KEY_SCOPE.READ_WRITE,
    });
    expect(onCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "dwk_test_abcdef",
        scope: API_KEY_SCOPE.READ_WRITE,
      }),
    );
  });
});
