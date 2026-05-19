import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { server } from "@/test/mocks/server";
import {
  adminSessionHandler,
  frozenSessionHandler,
  sessionFetchFailureHandler,
  sessionHandler,
  unauthenticatedHandler,
} from "@/test/mocks/handlers";
import { renderWithProviders } from "@/test/testUtils";
import { setupNextNavigation } from "@/test/mocks/modules/nextNavigation";
import AdminGuard from "./AdminGuard";

describe("AdminGuard", () => {
  beforeEach(() => {
    setupNextNavigation({ pathname: "/admin" });
  });

  it("admin ロールのときは子要素を描画する", async () => {
    server.use(adminSessionHandler);

    await renderWithProviders(
      <AdminGuard>
        <p data-testid="admin-content">管理画面コンテンツ</p>
      </AdminGuard>,
    );

    expect(await screen.findByTestId("admin-content")).toBeInTheDocument();
  });

  it("role=user のときは /dashboard にリダイレクトされ子要素は描画されない", async () => {
    const { router } = setupNextNavigation({ pathname: "/admin" });

    await renderWithProviders(
      <AdminGuard>
        <p data-testid="admin-content">管理画面コンテンツ</p>
      </AdminGuard>,
    );

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/dashboard");
    });
    expect(screen.queryByTestId("admin-content")).not.toBeInTheDocument();
    expect(screen.getByText("管理者権限が必要です")).toBeInTheDocument();
  });

  it("未認証のときは /signin?redirect=%2Fadmin にリダイレクトされる", async () => {
    server.use(unauthenticatedHandler);
    const { router } = setupNextNavigation({ pathname: "/admin" });

    await renderWithProviders(
      <AdminGuard>
        <p data-testid="admin-content">管理画面コンテンツ</p>
      </AdminGuard>,
    );

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/signin?redirect=%2Fadmin");
    });
    expect(screen.queryByTestId("admin-content")).not.toBeInTheDocument();
  });

  it("admin かつ frozen のときは /dashboard にリダイレクトされる", async () => {
    server.use(sessionHandler({ role: "admin", frozen: true }));
    const { router } = setupNextNavigation({ pathname: "/admin" });

    await renderWithProviders(
      <AdminGuard>
        <p data-testid="admin-content">管理画面コンテンツ</p>
      </AdminGuard>,
    );

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/dashboard");
    });
    expect(screen.queryByTestId("admin-content")).not.toBeInTheDocument();
  });

  it("frozen な一般ユーザーも /dashboard にリダイレクトされる", async () => {
    server.use(frozenSessionHandler);
    const { router } = setupNextNavigation({ pathname: "/admin" });

    await renderWithProviders(
      <AdminGuard>
        <p data-testid="admin-content">管理画面コンテンツ</p>
      </AdminGuard>,
    );

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/dashboard");
    });
    expect(screen.queryByTestId("admin-content")).not.toBeInTheDocument();
  });

  it("セッション取得が transient エラーのときは redirect せず案内文を表示する", async () => {
    server.use(sessionFetchFailureHandler);
    const { router } = setupNextNavigation({ pathname: "/admin" });

    await renderWithProviders(
      <AdminGuard>
        <p data-testid="admin-content">管理画面コンテンツ</p>
      </AdminGuard>,
    );

    expect(
      await screen.findByText("セッションを確認できませんでした"),
    ).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
    expect(screen.queryByTestId("admin-content")).not.toBeInTheDocument();
  });
});
