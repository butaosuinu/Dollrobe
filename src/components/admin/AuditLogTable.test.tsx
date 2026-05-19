import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/testUtils";
import AuditLogTable from "./AuditLogTable";
import type { AdminAuditLog } from "@/stores/adminAtoms";

const buildLog = (overrides: Partial<AdminAuditLog> = {}): AdminAuditLog => ({
  id: overrides.id ?? "log-1",
  actorUserId: overrides.actorUserId ?? "admin-1",
  action: overrides.action ?? "user.freeze",
  targetUserId: overrides.targetUserId,
  metadata: overrides.metadata,
  createdAt: overrides.createdAt ?? new Date("2025-06-15T10:00:00Z").getTime(),
});

describe("AuditLogTable", () => {
  it("ヘッダーと action / actor / target / metadata が表示される", async () => {
    await renderWithProviders(
      <AuditLogTable
        logs={[
          buildLog({
            id: "log-1",
            actorUserId: "actor-A",
            targetUserId: "target-B",
            metadata: '{"reason":"spam"}',
          }),
        ]}
      />,
    );

    expect(screen.getByText("発生日時")).toBeInTheDocument();
    expect(screen.getByText("操作")).toBeInTheDocument();
    expect(screen.getByText("実行者")).toBeInTheDocument();
    expect(screen.getByText("対象")).toBeInTheDocument();
    expect(screen.getByText("メタデータ")).toBeInTheDocument();

    expect(screen.getByText("actor-A")).toBeInTheDocument();
    expect(screen.getByText("target-B")).toBeInTheDocument();
    expect(screen.getByText('{"reason":"spam"}')).toBeInTheDocument();
    expect(screen.getByText("user.freeze")).toBeInTheDocument();
  });

  it("targetUserId が undefined のとき — 表示になる", async () => {
    await renderWithProviders(
      <AuditLogTable
        logs={[
          buildLog({
            id: "log-no-target",
            targetUserId: undefined,
          }),
        ]}
      />,
    );

    // 対象セルは — になる。metadata も undefined のときも — になる。
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it("metadata が undefined または 空文字列のとき — 表示になる", async () => {
    await renderWithProviders(
      <AuditLogTable
        logs={[
          buildLog({
            id: "log-meta-undef",
            targetUserId: "t-1",
            metadata: undefined,
          }),
          buildLog({
            id: "log-meta-empty",
            targetUserId: "t-2",
            metadata: "",
          }),
        ]}
      />,
    );

    // 各 log の metadata セルがそれぞれ — を出す
    expect(screen.getAllByText("—")).toHaveLength(2);
  });

  it("UTC 形式の日時文字列が表示される", async () => {
    await renderWithProviders(
      <AuditLogTable
        logs={[
          buildLog({
            id: "log-time",
            createdAt: new Date("2025-06-15T10:00:00.000Z").getTime(),
          }),
        ]}
      />,
    );

    expect(
      screen.getByText(/2025-06-15 10:00:00\.000 UTC/),
    ).toBeInTheDocument();
  });

  it("logs が 空のときヘッダーのみで本文行は出ない", async () => {
    await renderWithProviders(<AuditLogTable logs={[]} />);

    // ヘッダー以外の行が存在しないことを確認
    expect(screen.getByText("操作")).toBeInTheDocument();
    expect(screen.queryAllByText("user.freeze")).toHaveLength(0);
  });
});
