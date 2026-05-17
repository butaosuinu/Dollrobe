import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/testUtils";
import UserTable from "./UserTable";
import type { AdminUser } from "@/stores/adminAtoms";

const buildUser = (overrides: Partial<AdminUser> = {}): AdminUser => ({
  id: overrides.id ?? "u-1",
  name: overrides.name ?? "ユーザー名",
  email: overrides.email ?? "user@example.com",
  emailVerified: overrides.emailVerified ?? true,
  image: overrides.image,
  role: overrides.role ?? "user",
  frozen: overrides.frozen ?? false,
  createdAt: overrides.createdAt ?? new Date("2025-01-01").getTime(),
  updatedAt: overrides.updatedAt ?? new Date("2025-01-02").getTime(),
});

describe("UserTable", () => {
  it("一般ユーザーと管理者で role バッジが切り替わる", async () => {
    await renderWithProviders(
      <UserTable
        users={[
          buildUser({ id: "u-user", role: "user" }),
          buildUser({
            id: "u-admin",
            role: "admin",
            email: "admin@example.com",
          }),
        ]}
      />,
    );

    expect(screen.getByText("一般")).toBeInTheDocument();
    expect(screen.getByText("管理者")).toBeInTheDocument();
  });

  it("frozen=true のユーザーは 凍結中 バッジが、false のユーザーは 有効 バッジが表示される", async () => {
    await renderWithProviders(
      <UserTable
        users={[
          buildUser({ id: "u-active", frozen: false }),
          buildUser({
            id: "u-frozen",
            frozen: true,
            email: "frozen@example.com",
          }),
        ]}
      />,
    );

    expect(screen.getByText("有効")).toBeInTheDocument();
    expect(screen.getByText("凍結中")).toBeInTheDocument();
  });

  it("詳細リンクは /admin/users/<id> を指す", async () => {
    await renderWithProviders(
      <UserTable users={[buildUser({ id: "u-target" })]} />,
    );

    const link = screen.getByRole("link", { name: "ユーザー詳細を開く" });
    expect(link).toHaveAttribute("href", "/admin/users/u-target");
  });

  it("登録日が ISO の年月日形式で表示される", async () => {
    await renderWithProviders(
      <UserTable
        users={[
          buildUser({
            id: "u-date",
            createdAt: new Date("2025-03-15T00:00:00Z").getTime(),
          }),
        ]}
      />,
    );

    expect(screen.getByText("2025-03-15")).toBeInTheDocument();
  });

  it("users が空のとき本文行は出ない (ヘッダーのみ)", async () => {
    await renderWithProviders(<UserTable users={[]} />);

    expect(screen.getByText("名前")).toBeInTheDocument();
    expect(screen.queryByText("一般")).not.toBeInTheDocument();
    expect(screen.queryByText("管理者")).not.toBeInTheDocument();
  });
});
