import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { server } from "@/test/mocks/server";
import { unauthenticatedHandler } from "@/test/mocks/handlers";
import { setupNextNavigation } from "@/test/mocks/modules/nextNavigation";
import { renderWithProviders } from "@/test/testUtils";
import LandingPage from "./page";

describe("LandingPage", () => {
  beforeEach(() => {
    setupNextNavigation({ pathname: "/" });
  });

  it("未認証時に LP の主要見出しが表示される", async () => {
    server.use(unauthenticatedHandler);

    await renderWithProviders(<LandingPage />);

    expect(
      await screen.findByRole("heading", { level: 1 }),
    ).toBeInTheDocument();
  });

  it("CTA リンクが /signin?redirect=%2Fdashboard を指す", async () => {
    server.use(unauthenticatedHandler);

    await renderWithProviders(<LandingPage />);

    const ctaLinks = await screen.findAllByRole("link", {
      name: /無料で始める|始める/,
    });
    expect(ctaLinks.length).toBeGreaterThan(0);
    for (const link of ctaLinks) {
      expect(link).toHaveAttribute("href", "/signin?redirect=%2Fdashboard");
    }
  });

  it("認証済みのときは /dashboard へリダイレクトする", async () => {
    const { router } = setupNextNavigation({ pathname: "/" });

    await renderWithProviders(<LandingPage />);

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/dashboard");
    });
  });
});
