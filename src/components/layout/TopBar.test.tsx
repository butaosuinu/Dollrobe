import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/testUtils";
import { setupNextNavigation } from "@/test/mocks/modules/nextNavigation";
import TopBar from "./TopBar";

vi.mock("@/components/settings/LocaleSelector", () => ({
  default: () => <div data-testid="locale-selector" />,
}));

vi.mock("@/components/auth/UserMenu", () => ({
  default: () => <div data-testid="user-menu" />,
}));

const ACTIVE_LINK_CLASS = "bg-primary-100";

describe("TopBar", () => {
  beforeEach(() => {
    setupNextNavigation({ pathname: "/dashboard" });
  });

  describe("ナビゲーションのアクティブ状態", () => {
    it("pathname が '/' のとき ホームリンクがアクティブになる", async () => {
      await renderWithProviders(<TopBar />);

      const homeLink = screen.getByRole("link", { name: /ホーム/ });
      const wardrobeLink = screen.getByRole("link", { name: /ワードローブ/ });

      expect(homeLink.className).toContain(ACTIVE_LINK_CLASS);
      expect(wardrobeLink.className).not.toContain(ACTIVE_LINK_CLASS);
    });

    it("pathname が '/garments' で始まるとき ワードローブリンクがアクティブになる", async () => {
      setupNextNavigation({ pathname: "/garments/123" });
      await renderWithProviders(<TopBar />);

      const homeLink = screen.getByRole("link", { name: /ホーム/ });
      const wardrobeLink = screen.getByRole("link", { name: /ワードローブ/ });

      expect(wardrobeLink.className).toContain(ACTIVE_LINK_CLASS);
      expect(homeLink.className).not.toContain(ACTIVE_LINK_CLASS);
    });

    it("pathname が他のパスのとき '/' は startsWith ではなく完全一致でのみアクティブになる", async () => {
      setupNextNavigation({ pathname: "/scan" });
      await renderWithProviders(<TopBar />);

      const homeLink = screen.getByRole("link", { name: /ホーム/ });
      const scanLink = screen.getByRole("link", { name: /スキャン/ });

      expect(homeLink.className).not.toContain(ACTIVE_LINK_CLASS);
      expect(scanLink.className).toContain(ACTIVE_LINK_CLASS);
    });
  });

  it("タイトル 'Doll Wardrobe' が表示される", async () => {
    await renderWithProviders(<TopBar />);

    expect(
      screen.getByRole("heading", { name: "Doll Wardrobe" }),
    ).toBeInTheDocument();
  });
});
