import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/testUtils";
import BottomNav from "./BottomNav";

const navMod = await vi.hoisted(
  async () => await import("@/test/mocks/modules/nextNavigation"),
);
const linkMod = await vi.hoisted(
  async () => await import("@/test/mocks/modules/nextLink"),
);
vi.mock("next/navigation", navMod.nextNavigationFactory);
vi.mock("next/link", linkMod.nextLinkFactory);

const ACTIVE_CLASS = "text-primary-500";
const INACTIVE_CLASS = "text-text-tertiary";
const SCAN_ACTIVE_BG = "bg-primary-500";
const SCAN_INACTIVE_BG = "bg-primary-100";

const setPathname = (path: string) => {
  navMod.setupNextNavigation({ pathname: path });
};

const renderNav = async () => {
  await renderWithProviders(<BottomNav />);
};

const getNavLink = (href: string) => {
  const links = screen.getAllByRole("link");
  const link = links.find((el) => el.getAttribute("href") === href);
  expect(link, `Nav link not found for href: ${href}`).toBeDefined();
  return link!;
};

describe("BottomNav", () => {
  beforeEach(() => {
    navMod.setupNextNavigation();
  });

  it("全てのナビゲーション項目を表示する", async () => {
    setPathname("/");
    await renderNav();

    expect(getNavLink("/")).toBeInTheDocument();
    expect(getNavLink("/garments")).toBeInTheDocument();
    expect(getNavLink("/coordinates")).toBeInTheDocument();
    expect(getNavLink("/scan")).toBeInTheDocument();
    expect(getNavLink("/dolls")).toBeInTheDocument();
    expect(getNavLink("/locations")).toBeInTheDocument();
  });

  it("各ナビゲーション項目のラベルを表示する", async () => {
    setPathname("/");
    await renderNav();

    expect(screen.getByText("ホーム")).toBeInTheDocument();
    expect(screen.getByText("ワードローブ")).toBeInTheDocument();
    expect(screen.getByText("コーデ")).toBeInTheDocument();
    expect(screen.getByText("スキャン")).toBeInTheDocument();
    expect(screen.getByText("ドール")).toBeInTheDocument();
    expect(screen.getByText("収納")).toBeInTheDocument();
  });

  it("pathname が / のときホームのみ active になる", async () => {
    setPathname("/");
    await renderNav();

    expect(getNavLink("/").className).toContain(ACTIVE_CLASS);
    expect(getNavLink("/garments").className).toContain(INACTIVE_CLASS);
    expect(getNavLink("/coordinates").className).toContain(INACTIVE_CLASS);
    expect(getNavLink("/dolls").className).toContain(INACTIVE_CLASS);
    expect(getNavLink("/locations").className).toContain(INACTIVE_CLASS);
  });

  it("pathname が /garments のときホームは active にならない（前方一致でなく完全一致）", async () => {
    setPathname("/garments");
    await renderNav();

    expect(getNavLink("/").className).toContain(INACTIVE_CLASS);
    expect(getNavLink("/").className).not.toContain(ACTIVE_CLASS);
  });

  it("pathname が /garments/123 のときワードローブが active になる（前方一致）", async () => {
    setPathname("/garments/123");
    await renderNav();

    expect(getNavLink("/garments").className).toContain(ACTIVE_CLASS);
    expect(getNavLink("/").className).toContain(INACTIVE_CLASS);
    expect(getNavLink("/locations").className).toContain(INACTIVE_CLASS);
  });

  it("pathname が /coordinates 配下のときコーデが active になる", async () => {
    setPathname("/coordinates/new");
    await renderNav();

    expect(getNavLink("/coordinates").className).toContain(ACTIVE_CLASS);
    expect(getNavLink("/garments").className).toContain(INACTIVE_CLASS);
  });

  it("pathname が /scan のときスキャンボタンが active 表示になる", async () => {
    setPathname("/scan");
    await renderNav();

    const scanLink = getNavLink("/scan");
    expect(scanLink.className).toContain(ACTIVE_CLASS);
    const activeBubble = scanLink.querySelector(`.${SCAN_ACTIVE_BG}`);
    expect(activeBubble).toBeTruthy();
  });

  it("pathname が /scan 以外のときスキャンボタンは非 active 表示になる", async () => {
    setPathname("/garments");
    await renderNav();

    const scanLink = getNavLink("/scan");
    expect(scanLink.className).toContain(INACTIVE_CLASS);
    const inactiveBubble = scanLink.querySelector(`.${SCAN_INACTIVE_BG}`);
    expect(inactiveBubble).toBeTruthy();
  });

  it("スキャンボタンは特別なスタイル (-mt-3) を持ち、他のリンクは持たない", async () => {
    setPathname("/");
    await renderNav();

    const scanLink = getNavLink("/scan");
    expect(scanLink.className).toContain("-mt-3");

    const homeLink = getNavLink("/");
    expect(homeLink.className).not.toContain("-mt-3");
    expect(homeLink.className).toContain("px-3");
  });

  it("pathname が /dolls のときドールが active になる", async () => {
    setPathname("/dolls");
    await renderNav();

    expect(getNavLink("/dolls").className).toContain(ACTIVE_CLASS);
    expect(getNavLink("/").className).toContain(INACTIVE_CLASS);
  });

  it("pathname が /locations のとき収納が active になる", async () => {
    setPathname("/locations");
    await renderNav();

    expect(getNavLink("/locations").className).toContain(ACTIVE_CLASS);
    expect(getNavLink("/").className).toContain(INACTIVE_CLASS);
  });
});
