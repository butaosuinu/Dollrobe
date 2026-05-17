import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "@/test/mocks/server";
import { adminSessionHandler } from "@/test/mocks/handlers";
import { trpcQuery } from "@/test/mocks/trpc/handlerFactory";
import { renderWithProviders } from "@/test/testUtils";
import { setupNextNavigation } from "@/test/mocks/modules/nextNavigation";
import AdminUsersPage from "./page";

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
});
