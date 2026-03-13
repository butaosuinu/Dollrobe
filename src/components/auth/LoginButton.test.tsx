import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import LoginButton from "./LoginButton";

const mockSignInSocial = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/auth", () => ({
  signInSocial: (options: Record<string, unknown>) => mockSignInSocial(options),
}));

describe("LoginButton", () => {
  it("Twitter ログインボタンが正しいテキストで表示される", () => {
    render(<LoginButton provider="twitter" />);
    expect(
      screen.getByRole("button", { name: "X (Twitter) でログイン" }),
    ).toBeInTheDocument();
  });

  it("Google ログインボタンが正しいテキストで表示される", () => {
    render(<LoginButton provider="google" />);
    expect(
      screen.getByRole("button", { name: "Google でログイン" }),
    ).toBeInTheDocument();
  });

  it("クリック時にソーシャルログインが呼ばれる", async () => {
    const user = userEvent.setup();
    render(<LoginButton provider="twitter" />);

    await user.click(
      screen.getByRole("button", { name: "X (Twitter) でログイン" }),
    );

    expect(mockSignInSocial).toHaveBeenCalledWith({ provider: "twitter" });
  });

  it("ログインエラー時にconsole.errorが呼ばれる", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const loginError = new Error("OAuth failed");
    mockSignInSocial.mockRejectedValueOnce(loginError);

    const user = userEvent.setup();
    render(<LoginButton provider="twitter" />);
    await user.click(
      screen.getByRole("button", { name: "X (Twitter) でログイン" }),
    );

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "ソーシャルログイン失敗:",
      loginError,
    );
    consoleErrorSpy.mockRestore();
  });
});
