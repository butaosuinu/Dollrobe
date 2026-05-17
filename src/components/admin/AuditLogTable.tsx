"use client";

import { Trans } from "@lingui/react/macro";
import Badge from "@/components/ui/Badge";
import type { AdminAuditLog } from "@/stores/adminAtoms";

type Props = {
  readonly logs: readonly AdminAuditLog[];
};

const formatDateTime = (ms: number): string =>
  new Date(ms).toISOString().replace("T", " ").replace("Z", " UTC");

const formatMetadata = (raw: string | undefined): string => {
  if (raw === undefined || raw === "") return "—";
  return raw;
};

const AuditLogTable = ({ logs }: Props) => (
  <div className="overflow-x-auto rounded-xl border border-border-default bg-surface-overlay">
    <table className="w-full text-left text-sm">
      <thead className="bg-surface-base text-xs font-medium uppercase tracking-wider text-text-tertiary">
        <tr>
          <th scope="col" className="px-4 py-3">
            <Trans>発生日時</Trans>
          </th>
          <th scope="col" className="px-4 py-3">
            <Trans>操作</Trans>
          </th>
          <th scope="col" className="px-4 py-3">
            <Trans>実行者</Trans>
          </th>
          <th scope="col" className="px-4 py-3">
            <Trans>対象</Trans>
          </th>
          <th scope="col" className="px-4 py-3">
            <Trans>メタデータ</Trans>
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border-default">
        {logs.map((log) => (
          <tr key={log.id} className="hover:bg-primary-50/50 align-top">
            <td className="px-4 py-3 text-text-tertiary tabular-nums whitespace-nowrap">
              {formatDateTime(log.createdAt)}
            </td>
            <td className="px-4 py-3">
              <Badge variant="primary">{log.action}</Badge>
            </td>
            <td className="px-4 py-3 text-text-secondary font-mono text-xs">
              {log.actorUserId}
            </td>
            <td className="px-4 py-3 text-text-secondary font-mono text-xs">
              {log.targetUserId ?? "—"}
            </td>
            <td className="px-4 py-3 text-text-tertiary font-mono text-xs break-all">
              {formatMetadata(log.metadata)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default AuditLogTable;
