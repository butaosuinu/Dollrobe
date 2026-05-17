import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useHydrateAtoms } from "jotai/utils";
import { server } from "@/test/mocks/server";
import { adminSessionHandler } from "@/test/mocks/handlers";
import { trpcQuery } from "@/test/mocks/trpc/handlerFactory";
import { renderWithProviders } from "@/test/testUtils";
import { setupNextNavigation } from "@/test/mocks/modules/nextNavigation";
import { adminUsersQueryAtom, type AdminUsersQuery } from "@/stores/adminAtoms";
import AdminUsersPage from "./page";

const HydratedAdminUsersPage = ({
  initialQuery,
}: {
  readonly initialQuery: AdminUsersQuery;
}) => {
  useHydrateAtoms([[adminUsersQueryAtom, initialQuery]]);
  return <AdminUsersPage />;
};

type ListInput = {
  readonly search?: string;
  readonly role?: "admin" | "user";
  readonly frozen?: boolean;
  readonly limit: number;
  readonly offset: number;
};

const buildUser = (
  overrides: Partial<{
    id: string;
    name: string;
    email: string;
    role: "admin" | "user";
    frozen: boolean;
  }> = {},
) => ({
  id: overrides.id ?? "u-1",
  name: overrides.name ?? "ユーザー名",
  email: overrides.email ?? "user@example.com",
  emailVerified: true,
  image: undefined,
  role: overrides.role ?? ("user" as const),
  frozen: overrides.frozen ?? false,
  createdAt: new Date("2025-01-01").getTime(),
  updatedAt: new Date("2025-01-02").getTime(),
});

describe("AdminUsersPage", () => {
  beforeEach(() => {
    setupNextNavigation({ pathname: "/admin/users" });
    server.use(adminSessionHandler);
  });

  it("ユーザー一覧が表示される", async () => {
    server.use(
      trpcQuery("admin.users.list", () => ({
        items: [
          buildUser({ id: "u-alice", name: "Alice", email: "alice@x.com" }),
          buildUser({
            id: "u-bob",
            name: "Bob",
            email: "bob@x.com",
            role: "admin",
          }),
        ],
        total: 2,
      })),
    );

    await renderWithProviders(<AdminUsersPage />);

    expect(await screen.findByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("alice@x.com")).toBeInTheDocument();
    expect(screen.getByText("管理者")).toBeInTheDocument();
  });

  it("該当ユーザーがいないとき EmptyState が出る", async () => {
    server.use(trpcQuery("admin.users.list", () => ({ items: [], total: 0 })));

    await renderWithProviders(<AdminUsersPage />);

    expect(
      await screen.findByText("該当するユーザーがいません"),
    ).toBeInTheDocument();
  });

  it("検索ボックスに入力するとクエリが更新される", async () => {
    const user = userEvent.setup();
    const calls: ListInput[] = [];
    server.use(
      trpcQuery("admin.users.list", ({ input }) => {
        calls.push(input as ListInput);
        return { items: [], total: 0 };
      }),
    );

    await renderWithProviders(<AdminUsersPage />);

    await screen.findByText("該当するユーザーがいません");

    const searchBox = screen.getByPlaceholderText(
      "メールアドレスや名前で検索...",
    );
    await user.type(searchBox, "alice");

    await waitFor(() => {
      const lastCall = calls.at(-1);
      expect(lastCall?.search).toBe("alice");
    });
  });

  it("権限フィルターを切り替えると role が指定された queries が呼ばれる", async () => {
    const user = userEvent.setup();
    const calls: ListInput[] = [];
    server.use(
      trpcQuery("admin.users.list", ({ input }) => {
        calls.push(input as ListInput);
        return { items: [], total: 0 };
      }),
    );

    await renderWithProviders(<AdminUsersPage />);
    await screen.findByText("該当するユーザーがいません");

    await user.click(screen.getByRole("button", { name: "管理者のみ" }));

    await waitFor(() => {
      const lastCall = calls.at(-1);
      expect(lastCall?.role).toBe("admin");
    });
  });

  it("凍結フィルターを 凍結中のみ にすると frozen=true で問い合わせる", async () => {
    const user = userEvent.setup();
    const calls: ListInput[] = [];
    server.use(
      trpcQuery("admin.users.list", ({ input }) => {
        calls.push(input as ListInput);
        return { items: [], total: 0 };
      }),
    );

    await renderWithProviders(<AdminUsersPage />);
    await screen.findByText("該当するユーザーがいません");

    await user.click(screen.getByRole("button", { name: "凍結中のみ" }));

    await waitFor(() => {
      const lastCall = calls.at(-1);
      expect(lastCall?.frozen).toBe(true);
    });
  });

  it("詳細リンクがユーザー個別ページに向いている", async () => {
    server.use(
      trpcQuery("admin.users.list", () => ({
        items: [buildUser({ id: "u-detail-target", name: "Charlie" })],
        total: 1,
      })),
    );

    await renderWithProviders(<AdminUsersPage />);

    const link = await screen.findByRole("link", {
      name: "ユーザー詳細を開く",
    });
    expect(link).toHaveAttribute("href", "/admin/users/u-detail-target");
  });

  it("frozen=true のユーザーは 凍結中 バッジが表示される (テーブル分岐)", async () => {
    server.use(
      trpcQuery("admin.users.list", () => ({
        items: [
          buildUser({ id: "u-frozen", name: "Frozen", frozen: true }),
          buildUser({ id: "u-active", name: "Active", frozen: false }),
        ],
        total: 2,
      })),
    );

    await renderWithProviders(<AdminUsersPage />);

    expect(await screen.findByText("Frozen")).toBeInTheDocument();
    expect(screen.getByText("凍結中")).toBeInTheDocument();
    expect(screen.getByText("有効")).toBeInTheDocument();
  });

  it("Enter キーで form submit すると applyFilters 経由でクエリが投げられる", async () => {
    const user = userEvent.setup();
    const calls: ListInput[] = [];
    server.use(
      trpcQuery("admin.users.list", ({ input }) => {
        calls.push(input as ListInput);
        return { items: [], total: 0 };
      }),
    );

    await renderWithProviders(<AdminUsersPage />);
    await screen.findByText("該当するユーザーがいません");

    const searchBox = screen.getByPlaceholderText(
      "メールアドレスや名前で検索...",
    );
    // 検索文字を入力後 Enter で submit すると form の onSubmit -> applyFilters が走る
    await user.type(searchBox, "alice{Enter}");

    await waitFor(() => {
      const lastCall = calls.at(-1);
      expect(lastCall?.search).toBe("alice");
      expect(lastCall?.offset).toBe(0);
    });
  });

  it("検索を空文字に戻すと search=undefined で問い合わせる", async () => {
    const user = userEvent.setup();
    const calls: ListInput[] = [];
    server.use(
      trpcQuery("admin.users.list", ({ input }) => {
        calls.push(input as ListInput);
        return { items: [], total: 0 };
      }),
    );

    await renderWithProviders(<AdminUsersPage />);
    await screen.findByText("該当するユーザーがいません");

    const searchBox = screen.getByPlaceholderText(
      "メールアドレスや名前で検索...",
    );
    await user.type(searchBox, "a");
    await user.clear(searchBox);

    await waitFor(() => {
      const lastCall = calls.at(-1);
      expect(lastCall?.search).toBeUndefined();
    });
  });

  it("凍結フィルタを 有効のみ にすると frozen=false が指定される", async () => {
    const user = userEvent.setup();
    const calls: ListInput[] = [];
    server.use(
      trpcQuery("admin.users.list", ({ input }) => {
        calls.push(input as ListInput);
        return { items: [], total: 0 };
      }),
    );

    await renderWithProviders(<AdminUsersPage />);
    await screen.findByText("該当するユーザーがいません");

    await user.click(screen.getByRole("button", { name: "有効のみ" }));

    await waitFor(() => {
      const lastCall = calls.at(-1);
      expect(lastCall?.frozen).toBe(false);
    });
  });

  it("初期 query で frozen=true が指定されているとき 凍結中のみ チップが selected になる", async () => {
    server.use(trpcQuery("admin.users.list", () => ({ items: [], total: 0 })));

    await renderWithProviders(
      <HydratedAdminUsersPage
        initialQuery={{ frozen: true, limit: 50, offset: 0 }}
      />,
    );

    await screen.findByText("該当するユーザーがいません");

    const frozenOnlyChip = screen.getByRole("button", { name: "凍結中のみ" });
    expect(frozenOnlyChip.getAttribute("aria-pressed")).toBe("true");
  });

  it("初期 query で frozen=false が指定されているとき 有効のみ チップが selected になる", async () => {
    server.use(trpcQuery("admin.users.list", () => ({ items: [], total: 0 })));

    await renderWithProviders(
      <HydratedAdminUsersPage
        initialQuery={{ frozen: false, limit: 50, offset: 0 }}
      />,
    );

    await screen.findByText("該当するユーザーがいません");

    const activeOnlyChip = screen.getByRole("button", { name: "有効のみ" });
    expect(activeOnlyChip.getAttribute("aria-pressed")).toBe("true");
  });

  it("初期 query で role=admin が指定されているとき 管理者のみ チップが selected になる", async () => {
    server.use(trpcQuery("admin.users.list", () => ({ items: [], total: 0 })));

    await renderWithProviders(
      <HydratedAdminUsersPage
        initialQuery={{ role: "admin", limit: 50, offset: 0 }}
      />,
    );

    await screen.findByText("該当するユーザーがいません");

    const adminOnlyChip = screen.getByRole("button", { name: "管理者のみ" });
    expect(adminOnlyChip.getAttribute("aria-pressed")).toBe("true");
  });

  it("初期 query で search が指定されているとき 検索 box にその値が入っている", async () => {
    server.use(trpcQuery("admin.users.list", () => ({ items: [], total: 0 })));

    await renderWithProviders(
      <HydratedAdminUsersPage
        initialQuery={{ search: "preset", limit: 50, offset: 0 }}
      />,
    );

    await screen.findByText("該当するユーザーがいません");

    const searchBox = screen.getByPlaceholderText(
      "メールアドレスや名前で検索...",
    );
    expect(searchBox).toHaveValue("preset");
  });

  it("全権限 を選び直すと role=undefined にリセットされる", async () => {
    const user = userEvent.setup();
    const calls: ListInput[] = [];
    server.use(
      trpcQuery("admin.users.list", ({ input }) => {
        calls.push(input as ListInput);
        return { items: [], total: 0 };
      }),
    );

    await renderWithProviders(<AdminUsersPage />);
    await screen.findByText("該当するユーザーがいません");

    await user.click(screen.getByRole("button", { name: "管理者のみ" }));
    await user.click(screen.getByRole("button", { name: "全権限" }));

    await waitFor(() => {
      const lastCall = calls.at(-1);
      expect(lastCall?.role).toBeUndefined();
    });
  });

  it("Pagination の 次へ ボタンで limit ぶん offset を進めて再 fetch する", async () => {
    const user = userEvent.setup();
    const calls: ListInput[] = [];
    // 1 ページぶんの件数 + 全 total を返して 2 ページ以上ある状態にする
    const page1Items = Array.from({ length: 20 }, (_, i) =>
      buildUser({ id: `u-${i}`, name: `User ${i}` }),
    );
    server.use(
      trpcQuery("admin.users.list", ({ input }) => {
        calls.push(input as ListInput);
        return { items: page1Items, total: 60 };
      }),
    );

    await renderWithProviders(
      <HydratedAdminUsersPage initialQuery={{ limit: 20, offset: 0 }} />,
    );

    expect(await screen.findByText("User 0")).toBeInTheDocument();

    // モバイル / lg 両方のレイアウトに同じ aria-label が付くので、片方の
    // "次のページ" を押せば atom が更新されて再 fetch が走る。
    const nextButtons = await screen.findAllByRole("button", {
      name: "次のページ",
    });
    const firstNextButton = nextButtons.at(0);
    expect(firstNextButton).toBeInstanceOf(HTMLElement);
    if (firstNextButton === undefined) return;
    await user.click(firstNextButton);

    await waitFor(() => {
      const lastCall = calls.at(-1);
      expect(lastCall?.offset).toBe(20);
      expect(lastCall?.limit).toBe(20);
    });
  });

  it("Pagination で表示件数を変えると limit が更新され offset が 0 にリセットされる", async () => {
    const user = userEvent.setup();
    const calls: ListInput[] = [];
    server.use(
      trpcQuery("admin.users.list", ({ input }) => {
        calls.push(input as ListInput);
        return {
          items: [buildUser({ id: "u-only", name: "Only" })],
          total: 60,
        };
      }),
    );

    await renderWithProviders(
      <HydratedAdminUsersPage initialQuery={{ limit: 20, offset: 40 }} />,
    );

    await screen.findByText("Only");

    const sizeSelect = await screen.findByLabelText("表示件数");
    await user.selectOptions(sizeSelect, "50");

    await waitFor(() => {
      const lastCall = calls.at(-1);
      expect(lastCall?.limit).toBe(50);
      expect(lastCall?.offset).toBe(0);
    });
  });
});
