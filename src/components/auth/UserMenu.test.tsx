import { screen, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { server } from "@/test/mocks/server";
import { unauthenticatedHandler } from "@/test/mocks/handlers";
import { renderWithProviders } from "@/test/testUtils";
import UserMenu from "./UserMenu";

describe("UserMenu", () => {
  it("認証済みユーザーのイニシャルが表示される", async () => {
    await renderWithProviders(<UserMenu />);

    expect(await screen.findByText("テ")).toBeInTheDocument();
    expect(screen.getByLabelText("ログアウト")).toBeInTheDocument();
  });

  it("未認証時はログインリンクが表示される", async () => {
    server.use(unauthenticatedHandler);
    await renderWithProviders(<UserMenu />);

    await waitFor(() => {
      expect(screen.queryByTestId("suspense-loading")).not.toBeInTheDocument();
    });

    const loginLink = await screen.findByRole("link", { name: "ログイン" });
    expect(loginLink).toHaveAttribute("href", "/signin");
  });
});
