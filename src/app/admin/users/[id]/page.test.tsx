import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "@/test/mocks/server";
import { adminSessionHandler, sessionHandler } from "@/test/mocks/handlers";
import { trpcMutation, trpcQuery } from "@/test/mocks/trpc/handlerFactory";
import { renderWithProviders } from "@/test/testUtils";
import { setupNextNavigation } from "@/test/mocks/modules/nextNavigation";
import UserDetailPage from "./page";

type BuildUserOverrides = {
  readonly id?: string;
  readonly name?: string;
  readonly email?: string;
  readonly role?: "admin" | "user";
  readonly frozen?: boolean;
};

const buildUser = (overrides: BuildUserOverrides = {}) => {
  const role: "admin" | "user" = overrides.role ?? "user";
  return {
    id: overrides.id ?? "u-target",
    name: overrides.name ?? "対象ユーザー",
    email: overrides.email ?? "target@example.com",
    emailVerified: true,
    image: undefined,
    role,
    frozen: overrides.frozen ?? false,
    createdAt: new Date("2025-01-01").getTime(),
    updatedAt: new Date("2025-02-01").getTime(),
  };
};

const pageParams = (id: string) => ({
  params: Promise.resolve({ id }),
});

describe("UserDetailPage", () => {
  beforeEach(() => {
    setupNextNavigation({
      pathname: "/admin/users/u-target",
      params: { id: "u-target" },
    });
    server.use(adminSessionHandler);
  });

  it("ユーザー情報と凍結ボタンが表示される (一般ユーザー)", async () => {
    server.use(
      trpcQuery("admin.users.detail", () =>
        buildUser({
          id: "u-target",
          name: "Alice",
          email: "alice@example.com",
        }),
      ),
    );

    await renderWithProviders(<UserDetailPage {...pageParams("u-target")} />);

    expect(await screen.findByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /凍結する/ })).toBeEnabled();
  });

  it("管理者ユーザーは MVP 上凍結できない (ボタンが disabled)", async () => {
    server.use(
      trpcQuery("admin.users.detail", () =>
        buildUser({ id: "u-target", role: "admin" }),
      ),
    );

    await renderWithProviders(<UserDetailPage {...pageParams("u-target")} />);

    const button = await screen.findByRole("button", { name: /凍結する/ });
    expect(button).toBeDisabled();
    expect(
      screen.getByText("管理者の凍結は MVP では未対応です"),
    ).toBeInTheDocument();
  });

  it("自分自身のページは凍結できない (ボタンが disabled)", async () => {
    server.use(sessionHandler({ id: "u-target", role: "admin" }));
    server.use(
      trpcQuery("admin.users.detail", () =>
        buildUser({ id: "u-target", role: "admin" }),
      ),
    );

    await renderWithProviders(<UserDetailPage {...pageParams("u-target")} />);

    const button = await screen.findByRole("button", { name: /凍結する/ });
    expect(button).toBeDisabled();
    expect(screen.getByText("自分自身は凍結できません")).toBeInTheDocument();
  });

  it("凍結ボタンを押すと confirm sheet が出て、確定すると freeze mutation が呼ばれる", async () => {
    const user = userEvent.setup();
    const callRef: { current: { targetUserId: string } | undefined } = {
      current: undefined,
    };
    server.use(
      trpcQuery("admin.users.detail", () => buildUser({ id: "u-target" })),
      trpcMutation("admin.users.freeze", ({ input }) => {
        callRef.current = input as { targetUserId: string };
        return { ok: true as const, noop: false };
      }),
    );

    await renderWithProviders(<UserDetailPage {...pageParams("u-target")} />);

    await user.click(await screen.findByRole("button", { name: /凍結する/ }));
    // confirm sheet 内の確定ボタンを押す
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "凍結する" }));

    await waitFor(() => {
      expect(callRef.current?.targetUserId).toBe("u-target");
    });
  });

  it("凍結済みユーザーには 解凍する ボタンが出て、確定すると unfreeze mutation が呼ばれる", async () => {
    const user = userEvent.setup();
    const callRef: { current: { targetUserId: string } | undefined } = {
      current: undefined,
    };
    server.use(
      trpcQuery("admin.users.detail", () =>
        buildUser({ id: "u-target", frozen: true }),
      ),
      trpcMutation("admin.users.unfreeze", ({ input }) => {
        callRef.current = input as { targetUserId: string };
        return { ok: true as const, noop: false };
      }),
    );

    await renderWithProviders(<UserDetailPage {...pageParams("u-target")} />);

    await user.click(await screen.findByRole("button", { name: /解凍する/ }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "解凍する" }));

    await waitFor(() => {
      expect(callRef.current?.targetUserId).toBe("u-target");
    });
  });

  it("ユーザーが見つからないとき not found メッセージが出る", async () => {
    server.use(
      // 詳細 query が rejection を返すケース。adminAtoms 側で .catch して
      // undefined にダウングレードする経路を踏む。
      trpcQuery(
        "admin.users.detail",
        async () => await Promise.reject(new Error("NOT_FOUND")),
      ),
    );

    await renderWithProviders(<UserDetailPage {...pageParams("u-missing")} />);

    expect(
      await screen.findByText("このユーザーは見つかりません"),
    ).toBeInTheDocument();
  });

  it("UserDataTabs の初期タブで garments の空メッセージが表示される", async () => {
    server.use(
      trpcQuery("admin.users.detail", () => buildUser({ id: "u-target" })),
      trpcQuery("admin.userDataView.garments", () => ({
        items: [],
        total: 0,
      })),
    );

    await renderWithProviders(<UserDetailPage {...pageParams("u-target")} />);

    expect(
      await screen.findByText("このユーザーの服はまだ登録されていません"),
    ).toBeInTheDocument();
  });

  it("収納タブに切り替えると location 用のクエリが発火する", async () => {
    const user = userEvent.setup();
    const callRef: { current: { userId: string } | undefined } = {
      current: undefined,
    };
    server.use(
      trpcQuery("admin.users.detail", () => buildUser({ id: "u-target" })),
      trpcQuery("admin.userDataView.locations", ({ input }) => {
        callRef.current = input as { userId: string };
        return [];
      }),
    );

    await renderWithProviders(<UserDetailPage {...pageParams("u-target")} />);
    await screen.findByText("対象ユーザー");

    await user.click(screen.getByRole("button", { name: "収納" }));

    await waitFor(() => {
      expect(callRef.current?.userId).toBe("u-target");
    });
  });

  it("コーデタブに切り替えると coordinates クエリが発火する", async () => {
    const user = userEvent.setup();
    const callRef: { current: { userId: string } | undefined } = {
      current: undefined,
    };
    server.use(
      trpcQuery("admin.users.detail", () => buildUser({ id: "u-target" })),
      trpcQuery("admin.userDataView.coordinates", ({ input }) => {
        callRef.current = input as { userId: string };
        return { items: [], total: 0 };
      }),
    );

    await renderWithProviders(<UserDetailPage {...pageParams("u-target")} />);
    await screen.findByText("対象ユーザー");

    await user.click(screen.getByRole("button", { name: "コーデ" }));

    await waitFor(() => {
      expect(callRef.current?.userId).toBe("u-target");
    });
  });

  it("garments が 1 件以上あるとき名前・カテゴリ・件数フッターが表示される", async () => {
    server.use(
      trpcQuery("admin.users.detail", () => buildUser({ id: "u-target" })),
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
        total: 1,
      })),
    );

    await renderWithProviders(<UserDetailPage {...pageParams("u-target")} />);

    expect(await screen.findByText("黒ワンピ")).toBeInTheDocument();
    expect(screen.getByText("onepiece")).toBeInTheDocument();
    expect(screen.getByText(/1 \/ 1件表示/)).toBeInTheDocument();
  });
});
