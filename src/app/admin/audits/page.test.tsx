import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { server } from "@/test/mocks/server";
import { adminSessionHandler } from "@/test/mocks/handlers";
import { trpcQuery } from "@/test/mocks/trpc/handlerFactory";
import { renderWithProviders } from "@/test/testUtils";
import { setupNextNavigation } from "@/test/mocks/modules/nextNavigation";
import AdminAuditsPage from "./page";

const sampleLog = (
  overrides: Partial<{ id: string; action: string }> = {},
) => ({
  id: overrides.id ?? "log-1",
  actorUserId: "admin-1",
  action: overrides.action ?? "user.freeze",
  targetUserId: "user-x",
  metadata: '{"reason":"spam"}',
  createdAt: new Date("2025-06-15T10:00:00Z").getTime(),
});

describe("AdminAuditsPage", () => {
  beforeEach(() => {
    setupNextNavigation({ pathname: "/admin/audits" });
    server.use(adminSessionHandler);
  });

  it("監査ログが一覧表示される", async () => {
    server.use(
      trpcQuery("admin.audits.list", () => ({
        items: [
          sampleLog({ id: "log-1", action: "user.freeze" }),
          sampleLog({ id: "log-2", action: "user.unfreeze" }),
        ],
        total: 2,
      })),
    );

    await renderWithProviders(<AdminAuditsPage />);

    expect(await screen.findByText("user.freeze")).toBeInTheDocument();
    expect(screen.getByText("user.unfreeze")).toBeInTheDocument();
    expect(screen.getAllByText("admin-1")).toHaveLength(2);
    expect(screen.getAllByText("user-x")).toHaveLength(2);
    expect(screen.getAllByText(/spam/)).toHaveLength(2);
  });

  it("ログが空のとき EmptyState を表示する", async () => {
    server.use(trpcQuery("admin.audits.list", () => ({ items: [], total: 0 })));

    await renderWithProviders(<AdminAuditsPage />);

    expect(
      await screen.findByText("監査ログはまだありません"),
    ).toBeInTheDocument();
  });

  it("ヘッダーと説明が表示される", async () => {
    await renderWithProviders(<AdminAuditsPage />);

    expect(await screen.findByText("監査ログ")).toBeInTheDocument();
    expect(
      screen.getByText(
        /書き込み操作 \(凍結 \/ 解凍 等\) のみが記録されます。閲覧操作は記録されません。/,
      ),
    ).toBeInTheDocument();
  });
});
