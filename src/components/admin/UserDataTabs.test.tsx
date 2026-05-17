import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "@/test/mocks/server";
import { adminSessionHandler } from "@/test/mocks/handlers";
import { trpcQuery } from "@/test/mocks/trpc/handlerFactory";
import { renderWithProviders } from "@/test/testUtils";
import { setupNextNavigation } from "@/test/mocks/modules/nextNavigation";
import UserDataTabs from "./UserDataTabs";

describe("UserDataTabs", () => {
  beforeEach(() => {
    setupNextNavigation({ pathname: "/admin/users/u-target" });
    server.use(adminSessionHandler);
  });

  it("初期は 服 タブで garments 用クエリが発火し、空メッセージが表示される", async () => {
    server.use(
      trpcQuery("admin.userDataView.garments", () => ({
        items: [],
        total: 0,
      })),
    );

    await renderWithProviders(<UserDataTabs userId="u-target" />);

    expect(
      await screen.findByText("このユーザーの服はまだ登録されていません"),
    ).toBeInTheDocument();
  });

  it("garments に複数件あるとき名前・カテゴリ・件数フッターが表示される", async () => {
    server.use(
      trpcQuery("admin.userDataView.garments", () => ({
        items: [
          {
            id: "g-1",
            userId: "u-target",
            name: "黒ワンピ",
            category: "onepiece" as const,
            dollSizes: ["MSD" as const],
            colors: [],
            tags: [],
            imageUrl: undefined,
            locationId: undefined,
            status: "stored" as const,
            lastScannedAt: 0,
            confidenceDecayDays: 30,
            brand: undefined,
            checkedOutAt: undefined,
            recentCheckoutCount: 0,
            createdAt: 0,
            updatedAt: 0,
          },
        ],
        total: 3,
      })),
    );

    await renderWithProviders(<UserDataTabs userId="u-target" />);

    expect(await screen.findByText("黒ワンピ")).toBeInTheDocument();
    expect(screen.getByText("onepiece")).toBeInTheDocument();
    expect(screen.getByText(/1 \/ 3件表示/)).toBeInTheDocument();
  });

  it("収納 タブをクリックすると locations 用クエリが発火する", async () => {
    const user = userEvent.setup();
    const callRef: { current: { userId: string } | undefined } = {
      current: undefined,
    };
    server.use(
      trpcQuery("admin.userDataView.locations", ({ input }) => {
        callRef.current = input as { userId: string };
        return [];
      }),
    );

    await renderWithProviders(<UserDataTabs userId="u-target" />);

    // 初期 garments が解決するまで待ち、それから 収納 タブをクリック
    await screen.findByText("このユーザーの服はまだ登録されていません");
    await user.click(screen.getByRole("button", { name: "収納" }));

    await waitFor(() => {
      expect(callRef.current?.userId).toBe("u-target");
    });
  });

  it("コーデ タブをクリックすると coordinates 用クエリが発火する", async () => {
    const user = userEvent.setup();
    const callRef: { current: { userId: string } | undefined } = {
      current: undefined,
    };
    server.use(
      trpcQuery("admin.userDataView.coordinates", ({ input }) => {
        callRef.current = input as { userId: string };
        return { items: [], total: 0 };
      }),
    );

    await renderWithProviders(<UserDataTabs userId="u-target" />);

    await screen.findByText("このユーザーの服はまだ登録されていません");
    await user.click(screen.getByRole("button", { name: "コーデ" }));

    await waitFor(() => {
      expect(callRef.current?.userId).toBe("u-target");
    });
  });

  it("aria-current が active なタブのみに 設定される", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<UserDataTabs userId="u-target" />);

    await screen.findByText("このユーザーの服はまだ登録されていません");

    const garmentsTab = screen.getByRole("button", { name: "服" });
    const locationsTab = screen.getByRole("button", { name: "収納" });
    const coordinatesTab = screen.getByRole("button", { name: "コーデ" });

    // 初期 active = garments
    expect(garmentsTab.getAttribute("aria-current")).toBe("page");
    expect(locationsTab.getAttribute("aria-current")).toBeNull();
    expect(coordinatesTab.getAttribute("aria-current")).toBeNull();

    // 収納 タブをクリック
    await user.click(locationsTab);

    await waitFor(() => {
      expect(locationsTab.getAttribute("aria-current")).toBe("page");
    });
    expect(garmentsTab.getAttribute("aria-current")).toBeNull();
  });

  it("閲覧専用 バッジが常に表示される", async () => {
    await renderWithProviders(<UserDataTabs userId="u-target" />);

    expect(await screen.findByText("閲覧専用")).toBeInTheDocument();
  });

  it("ユーザーデータ閲覧 という aria-label の nav が描画される", async () => {
    await renderWithProviders(<UserDataTabs userId="u-target" />);

    expect(
      await screen.findByRole("navigation", { name: "ユーザーデータ閲覧" }),
    ).toBeInTheDocument();
  });
});
