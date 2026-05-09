import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { setupNextNavigation } from "@/test/mocks/modules/nextNavigation";
import { renderWithProviders } from "@/test/testUtils";
import AppShell from "./AppShell";

describe("AppShell", () => {
  beforeEach(() => {
    setupNextNavigation({ pathname: "/dashboard" });
  });

  it("通常のページでは TopBar / BottomNav が描画される", async () => {
    setupNextNavigation({ pathname: "/dashboard" });

    await renderWithProviders(
      <AppShell>
        <p data-testid="page-content">本文</p>
      </AppShell>,
    );

    expect(await screen.findByTestId("page-content")).toBeInTheDocument();
    // TopBar 内の banner role
    expect(screen.getByRole("banner")).toBeInTheDocument();
    // BottomNav 内の navigation role が存在
    expect(screen.getAllByRole("navigation").length).toBeGreaterThanOrEqual(1);
  });

  it("LP (/) では TopBar / BottomNav を描画せず子要素のみ表示する", async () => {
    setupNextNavigation({ pathname: "/" });

    await renderWithProviders(
      <AppShell>
        <p data-testid="lp-content">ランディング</p>
      </AppShell>,
    );

    expect(await screen.findByTestId("lp-content")).toBeInTheDocument();
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("/signin では TopBar / BottomNav を描画しない", async () => {
    setupNextNavigation({ pathname: "/signin" });

    await renderWithProviders(
      <AppShell>
        <p data-testid="signin-content">サインイン</p>
      </AppShell>,
    );

    expect(await screen.findByTestId("signin-content")).toBeInTheDocument();
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("/signup では TopBar / BottomNav を描画しない", async () => {
    setupNextNavigation({ pathname: "/signup" });

    await renderWithProviders(
      <AppShell>
        <p data-testid="signup-content">サインアップ</p>
      </AppShell>,
    );

    expect(await screen.findByTestId("signup-content")).toBeInTheDocument();
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});
