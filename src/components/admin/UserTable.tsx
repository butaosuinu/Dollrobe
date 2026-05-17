"use client";

import Link from "next/link";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
import { msg } from "@lingui/core/macro";
import Badge from "@/components/ui/Badge";
import type { AdminUser } from "@/stores/adminAtoms";

type Props = {
  readonly users: readonly AdminUser[];
};

const ISO_DATE_LENGTH = 10;

const formatDate = (ms: number): string =>
  new Date(ms).toISOString().slice(0, ISO_DATE_LENGTH);

const UserTable = ({ users }: Props) => {
  const { i18n } = useLingui();

  return (
    <div className="overflow-x-auto rounded-xl border border-border-default bg-surface-overlay">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-base text-xs font-medium uppercase tracking-wider text-text-tertiary">
          <tr>
            <th scope="col" className="px-4 py-3">
              <Trans>名前</Trans>
            </th>
            <th scope="col" className="px-4 py-3">
              <Trans>メール</Trans>
            </th>
            <th scope="col" className="px-4 py-3">
              <Trans>権限</Trans>
            </th>
            <th scope="col" className="px-4 py-3">
              <Trans>状態</Trans>
            </th>
            <th scope="col" className="px-4 py-3">
              <Trans>登録日</Trans>
            </th>
            <th scope="col" className="px-4 py-3 text-right">
              <span className="sr-only">
                <Trans>操作</Trans>
              </span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-default">
          {users.map((u) => (
            <tr key={u.id} className="hover:bg-primary-50/50">
              <td className="px-4 py-3 font-medium text-text-primary">
                {u.name}
              </td>
              <td className="px-4 py-3 text-text-secondary">{u.email}</td>
              <td className="px-4 py-3">
                {u.role === "admin" ? (
                  <Badge variant="primary">
                    <Trans>管理者</Trans>
                  </Badge>
                ) : (
                  <Badge>
                    <Trans>一般</Trans>
                  </Badge>
                )}
              </td>
              <td className="px-4 py-3">
                {u.frozen ? (
                  <Badge variant="unknown">
                    <Trans>凍結中</Trans>
                  </Badge>
                ) : (
                  <Badge variant="confirmed">
                    <Trans>有効</Trans>
                  </Badge>
                )}
              </td>
              <td className="px-4 py-3 text-text-tertiary tabular-nums">
                {formatDate(u.createdAt)}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/admin/users/${u.id}`}
                  aria-label={i18n._(msg`ユーザー詳細を開く`)}
                  className="text-sm font-medium text-primary-600 hover:underline"
                >
                  <Trans>詳細</Trans>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserTable;
