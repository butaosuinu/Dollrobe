import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { server } from "@/test/mocks/server";
import { adminSessionHandler } from "@/test/mocks/handlers";
import { trpcQuery } from "@/test/mocks/trpc/handlerFactory";
import { renderWithProviders } from "@/test/testUtils";
import { setupNextNavigation } from "@/test/mocks/modules/nextNavigation";
import AdminMetricsPage from "./page";

describe("AdminMetricsPage", () => {
  beforeEach(() => {
    setupNextNavigation({ pathname: "/admin" });
    server.use(adminSessionHandler);
  });

  it("メトリクスの値が KPI カードに表示される", async () => {
    server.use(
      trpcQuery("admin.metrics.summary", () => ({
        totalUsers: 42,
        frozenUsers: 3,
        totalGarments: 1234,
        totalCoordinates: 56,
        totalLocations: 78,
        signupsLast7d: 9,
      })),
    );

    await renderWithProviders(<AdminMetricsPage />);

    expect(await screen.findByText("42")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("1,234")).toBeInTheDocument();
    expect(screen.getByText("56")).toBeInTheDocument();
    expect(screen.getByText("78")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.getByText("総ユーザー数")).toBeInTheDocument();
    expect(screen.getByText("凍結中ユーザー")).toBeInTheDocument();
    expect(screen.getByText("直近7日のサインアップ")).toBeInTheDocument();
  });

  it("デフォルト resolver では全カードが 0 で表示される", async () => {
    await renderWithProviders(<AdminMetricsPage />);

    const zeros = await screen.findAllByText("0");
    expect(zeros.length).toBeGreaterThanOrEqual(6);
  });
});
