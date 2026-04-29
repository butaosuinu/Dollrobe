import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/testUtils";
import { syncStatusAtom } from "@/stores/syncAtoms";
import { SYNC_STATUS } from "@/lib/constants";
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

  describe("SyncIndicator", () => {
    it("IDLE 状態では Cloud アイコンを表示する", async () => {
      await renderWithProviders(<TopBar />);

      await waitFor(() => {
        expect(
          screen.queryByTestId("suspense-loading"),
        ).not.toBeInTheDocument();
      });

      expect(document.querySelector(".animate-spin")).toBeNull();
      expect(document.querySelector(".text-danger")).toBeNull();
      expect(document.querySelector(".text-text-tertiary")).not.toBeNull();
    });

    it("SYNCING 状態では Loader2 (animate-spin) を表示する", async () => {
      const { store } = await renderWithProviders(<TopBar />);

      await waitFor(() => {
        expect(
          screen.queryByTestId("suspense-loading"),
        ).not.toBeInTheDocument();
      });

      act(() => {
        store.set(syncStatusAtom, SYNC_STATUS.SYNCING);
      });

      expect(document.querySelector(".animate-spin")).not.toBeNull();
    });

    it("ERROR 状態では CloudOff (text-danger) を表示する", async () => {
      const { store } = await renderWithProviders(<TopBar />);

      await waitFor(() => {
        expect(
          screen.queryByTestId("suspense-loading"),
        ).not.toBeInTheDocument();
      });

      act(() => {
        store.set(syncStatusAtom, SYNC_STATUS.ERROR);
      });

      expect(document.querySelector(".text-danger")).not.toBeNull();
    });
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
