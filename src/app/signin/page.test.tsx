import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { server } from "@/test/mocks/server";
import { unauthenticatedHandler } from "@/test/mocks/handlers";
import { renderWithProviders } from "@/test/testUtils";
import { setupNextNavigation } from "@/test/mocks/modules/nextNavigation";
import SignInPage from "./page";

describe("SignInPage", () => {
  beforeEach(() => {
    setupNextNavigation();
  });

  it("未認証時に Twitter / Google のログインボタンが表示される", async () => {
    server.use(unauthenticatedHandler);

    await renderWithProviders(<SignInPage />);

    expect(
      await screen.findByRole("button", { name: "X (Twitter) でログイン" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Google でログイン" }),
    ).toBeInTheDocument();
  });

  it("認証済みの場合はホームへリダイレクトされる", async () => {
    const { router } = setupNextNavigation();

    await renderWithProviders(<SignInPage />);

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/");
    });
  });
});
