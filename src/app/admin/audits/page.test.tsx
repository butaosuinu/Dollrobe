import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useHydrateAtoms } from "jotai/utils";
import { server } from "@/test/mocks/server";
import { adminSessionHandler } from "@/test/mocks/handlers";
import { trpcQuery } from "@/test/mocks/trpc/handlerFactory";
import { renderWithProviders } from "@/test/testUtils";
import { setupNextNavigation } from "@/test/mocks/modules/nextNavigation";
import {
  adminAuditsQueryAtom,
  type AdminAuditsQuery,
} from "@/stores/adminAtoms";
import AdminAuditsPage from "./page";

const HydratedAdminAuditsPage = ({
  initialQuery,
}: {
  readonly initialQuery: AdminAuditsQuery;
}) => {
  useHydrateAtoms([[adminAuditsQueryAtom, initialQuery]]);
  return <AdminAuditsPage />;
};

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

  it("Pagination の 次へ ボタンで limit ぶん offset を進めて再 fetch する", async () => {
    const user = userEvent.setup();
    // 1 ページぶんの件数 + 全 total を返して 2 ページ以上ある状態にする
    const page1Items = Array.from({ length: 20 }, (_, i) =>
      sampleLog({ id: `log-${i}`, action: "user.freeze" }),
    );
    const resolver = vi.fn(() => ({ items: page1Items, total: 60 }));
    server.use(trpcQuery("admin.audits.list", resolver));

    await renderWithProviders(
      <HydratedAdminAuditsPage initialQuery={{ limit: 20, offset: 0 }} />,
    );

    // Pagination が描画されたことを確認 (Suspense 解決後)
    const nextButtons = await screen.findAllByRole("button", {
      name: "次のページ",
    });
    const firstNextButton = nextButtons.at(0);
    expect(firstNextButton).toBeInstanceOf(HTMLElement);
    if (firstNextButton === undefined) return;
    await user.click(firstNextButton);

    await waitFor(() => {
      expect(resolver).toHaveBeenLastCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({ limit: 20, offset: 20 }),
        }),
      );
    });
  });

  it("Pagination で表示件数を変えると limit が更新され offset が 0 にリセットされる", async () => {
    const user = userEvent.setup();
    const resolver = vi.fn(() => ({
      items: [sampleLog({ id: "log-only" })],
      total: 60,
    }));
    server.use(trpcQuery("admin.audits.list", resolver));

    await renderWithProviders(
      <HydratedAdminAuditsPage initialQuery={{ limit: 20, offset: 40 }} />,
    );

    const sizeSelect = await screen.findByLabelText("表示件数");
    await user.selectOptions(sizeSelect, "50");

    await waitFor(() => {
      expect(resolver).toHaveBeenLastCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({ limit: 50, offset: 0 }),
        }),
      );
    });
  });
});
