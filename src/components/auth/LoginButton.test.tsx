import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { I18nTestWrapper } from "@/test/i18nWrapper";
import { installObjectProperty } from "@/test/helpers/propertyMock";
import LoginButton from "./LoginButton";

const mockSignInSocial = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/auth", () => ({
  signInSocial: (options: Record<string, unknown>) => mockSignInSocial(options),
}));

describe("LoginButton", () => {
  it("Twitter ログインボタンが正しいテキストで表示される", () => {
    render(<LoginButton provider="twitter" />, { wrapper: I18nTestWrapper });
    expect(
      screen.getByRole("button", { name: "X (Twitter) でログイン" }),
    ).toBeInTheDocument();
  });

  it("Google ログインボタンが正しいテキストで表示される", () => {
    render(<LoginButton provider="google" />, { wrapper: I18nTestWrapper });
    expect(
      screen.getByRole("button", { name: "Google でログイン" }),
    ).toBeInTheDocument();
  });

  it("クリック時にソーシャルログインが呼ばれる", async () => {
    const user = userEvent.setup();
    render(<LoginButton provider="twitter" />, { wrapper: I18nTestWrapper });

    await user.click(
      screen.getByRole("button", { name: "X (Twitter) でログイン" }),
    );

    expect(mockSignInSocial).toHaveBeenCalledWith({ provider: "twitter" });
  });

  it("callbackURL prop が渡されたとき signInSocial に絶対 URL で渡される", async () => {
    installObjectProperty(window, "location", {
      origin: "https://example.test",
    });
    const user = userEvent.setup();
    render(<LoginButton provider="google" callbackURL="/dashboard" />, {
      wrapper: I18nTestWrapper,
    });

    await user.click(screen.getByRole("button", { name: "Google でログイン" }));

    expect(mockSignInSocial).toHaveBeenCalledWith({
      provider: "google",
      callbackURL: "https://example.test/dashboard",
    });
  });

  it("callbackURL が // で始まるときは signInSocial に callbackURL が渡されない", async () => {
    installObjectProperty(window, "location", {
      origin: "https://example.test",
    });
    const user = userEvent.setup();
    render(
      <LoginButton provider="google" callbackURL="//evil.example.com/bad" />,
      { wrapper: I18nTestWrapper },
    );

    await user.click(screen.getByRole("button", { name: "Google でログイン" }));

    expect(mockSignInSocial).toHaveBeenCalledWith({ provider: "google" });
  });

  it("ログインエラー時にconsole.errorが呼ばれる", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const loginError = new Error("OAuth failed");
    mockSignInSocial.mockRejectedValueOnce(loginError);

    const user = userEvent.setup();
    render(<LoginButton provider="twitter" />, { wrapper: I18nTestWrapper });
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
