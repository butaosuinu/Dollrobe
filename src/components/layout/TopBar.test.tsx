import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/testUtils";
import TopBar from "./TopBar";

const pathnameMock = vi.hoisted(() => ({ value: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock.value,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    readonly href: string;
    readonly children: React.ReactNode;
  } & Record<string, unknown>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/hooks/useOnlineSync", () => ({
  useOnlineSync: () => undefined,
}));

vi.mock("@/components/settings/LocaleSelector", () => ({
  default: () => <div data-testid="locale-selector" />,
}));

vi.mock("@/components/auth/UserMenu", () => ({
  default: () => <div data-testid="user-menu" />,
}));

const ACTIVE_LINK_CLASS = "bg-primary-100";

describe("TopBar", () => {
  beforeEach(() => {
    pathnameMock.value = "/";
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
      pathnameMock.value = "/garments/123";
      await renderWithProviders(<TopBar />);

      const homeLink = screen.getByRole("link", { name: /ホーム/ });
      const wardrobeLink = screen.getByRole("link", { name: /ワードローブ/ });

      expect(wardrobeLink.className).toContain(ACTIVE_LINK_CLASS);
      expect(homeLink.className).not.toContain(ACTIVE_LINK_CLASS);
    });

    it("pathname が他のパスのとき '/' は startsWith ではなく完全一致でのみアクティブになる", async () => {
      pathnameMock.value = "/scan";
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
