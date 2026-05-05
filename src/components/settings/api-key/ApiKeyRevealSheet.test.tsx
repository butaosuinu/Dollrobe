import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { renderWithProviders } from "@/test/testUtils";
import { installClipboard } from "@/test/helpers/clipboard";
import { API_KEY_SCOPE, type CreatedApiKey } from "@/lib/auth";
import ApiKeyRevealSheet from "./ApiKeyRevealSheet";

const createdKey: CreatedApiKey = {
  id: "key-new",
  name: "agent-x",
  scope: API_KEY_SCOPE.READ_ONLY,
  createdAt: 1_700_000_000_000,
  lastRequestAt: undefined,
  enabled: true,
  key: "dwk_test_abcdef123",
};

describe("ApiKeyRevealSheet", () => {
  it("createdKey=undefined のときは何も表示されない", async () => {
    const onClose = vi.fn();
    await renderWithProviders(
      <ApiKeyRevealSheet createdKey={undefined} onClose={onClose} />,
    );

    expect(screen.queryByTestId("api-key-value")).toBeNull();
  });

  it("生キーが画面に表示される", async () => {
    const onClose = vi.fn();
    await renderWithProviders(
      <ApiKeyRevealSheet createdKey={createdKey} onClose={onClose} />,
    );

    const keyEl = await screen.findByTestId("api-key-value");
    expect(keyEl.textContent).toBe("dwk_test_abcdef123");
  });

  it("コピーボタンで navigator.clipboard.writeText が生キーで呼ばれる", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    const { writeText } = installClipboard();

    await renderWithProviders(
      <ApiKeyRevealSheet createdKey={createdKey} onClose={onClose} />,
    );

    await user.click(
      await screen.findByRole("button", { name: "API キーをコピー" }),
    );

    expect(writeText).toHaveBeenCalledWith("dwk_test_abcdef123");
    expect(await screen.findByText("コピー済み")).toBeInTheDocument();
  });

  it("「完了」ボタンで onClose が呼ばれる", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    await renderWithProviders(
      <ApiKeyRevealSheet createdKey={createdKey} onClose={onClose} />,
    );

    await user.click(await screen.findByRole("button", { name: "完了" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("コピー失敗時は「コピー済み」状態にならない", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    const { writeText } = installClipboard({ shouldFail: true });

    await renderWithProviders(
      <ApiKeyRevealSheet createdKey={createdKey} onClose={onClose} />,
    );

    await user.click(
      await screen.findByRole("button", { name: "API キーをコピー" }),
    );

    expect(writeText).toHaveBeenCalledWith("dwk_test_abcdef123");
    expect(screen.queryByText("コピー済み")).toBeNull();
  });
});
