import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { server } from "@/test/mocks/server";
import { unauthenticatedHandler } from "@/test/mocks/handlers";
import { renderWithProviders } from "@/test/testUtils";
import { setupNextNavigation } from "@/test/mocks/modules/nextNavigation";
import { installObjectProperty } from "@/test/helpers/propertyMock";
import RequireAuth from "./RequireAuth";

describe("RequireAuth", () => {
  beforeEach(() => {
    setupNextNavigation();
    installObjectProperty(window.navigator, "onLine", true);
  });

  it("認証済みのとき子要素が描画される", async () => {
    await renderWithProviders(
      <RequireAuth>
        <p data-testid="protected-content">秘匿ページ</p>
      </RequireAuth>,
    );

    expect(await screen.findByTestId("protected-content")).toBeInTheDocument();
  });

  it("未認証 + オンラインのとき /signin に redirect される", async () => {
    server.use(unauthenticatedHandler);
    const { router } = setupNextNavigation();

    await renderWithProviders(
      <RequireAuth>
        <p data-testid="protected-content">秘匿ページ</p>
      </RequireAuth>,
    );

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/signin");
    });
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
  });

  it("未認証 + オフラインのとき案内文が表示され redirect しない", async () => {
    server.use(unauthenticatedHandler);
    installObjectProperty(window.navigator, "onLine", false);
    const { router } = setupNextNavigation();

    await renderWithProviders(
      <RequireAuth>
        <p data-testid="protected-content">秘匿ページ</p>
      </RequireAuth>,
    );

    expect(await screen.findByText("ログインが必要です")).toBeInTheDocument();
    expect(
      screen.getByText("オンラインに戻るとログイン画面に進めます"),
    ).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
  });
});
