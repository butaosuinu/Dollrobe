"use client";

import { useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { KeyRound } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { msg, t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { apiKeysAtom, revokeApiKeyAtom } from "@/stores/apiKeyAtoms";
import { addToastAtom } from "@/stores/toastAtoms";
import type { ApiKeyScope, ApiKeySummary } from "@/lib/auth";
import { formatDateTime } from "@/lib/formatDate";
import { isSupportedLocale } from "@/i18n/types";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmSheet from "@/components/ui/ConfirmSheet";
import EmptyState from "@/components/ui/EmptyState";

const SCOPE_BADGE: Record<
  ApiKeyScope,
  {
    readonly variant: "primary" | "default";
    readonly label: ReturnType<typeof msg>;
  }
> = {
  "read-write": { variant: "primary", label: msg`read-write` },
  "read-only": { variant: "default", label: msg`read-only` },
};

const ApiKeyList = () => {
  const apiKeys = useAtomValue(apiKeysAtom);
  const revoke = useSetAtom(revokeApiKeyAtom);
  const addToast = useSetAtom(addToastAtom);
  const { i18n } = useLingui();
  const locale = isSupportedLocale(i18n.locale) ? i18n.locale : "ja";

  const [revokingKey, setRevokingKey] = useState<ApiKeySummary | undefined>(
    undefined,
  );

  const handleRevoke = async () => {
    if (revokingKey === undefined) return;
    const target = revokingKey;
    setRevokingKey(undefined);
    const failure = await revoke(target.id).catch(() => "failed" as const);
    if (failure === "failed") {
      addToast({ message: t`API キーの失効に失敗しました` });
      return;
    }
    addToast({ message: t`API キー「${target.name}」を失効しました` });
  };

  if (apiKeys.length === 0) {
    return (
      <EmptyState
        icon={KeyRound}
        title={t`まだ API キーがありません`}
        description={t`外部エージェントから接続するための API キーを発行できます`}
      />
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-3">
        {apiKeys.map((apiKey) => {
          const badge = SCOPE_BADGE[apiKey.scope];
          return (
            <li
              key={apiKey.id}
              className="flex flex-col gap-2 rounded-xl border border-border-default bg-surface-overlay p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-text-primary">
                    {apiKey.name}
                  </span>
                  <Badge variant={badge.variant}>{i18n._(badge.label)}</Badge>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setRevokingKey(apiKey)}
                >
                  <Trans>失効</Trans>
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-text-tertiary">
                <div className="flex flex-col">
                  <span>
                    <Trans>作成日時</Trans>
                  </span>
                  <span className="text-text-secondary">
                    {formatDateTime({ timestamp: apiKey.createdAt, locale })}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span>
                    <Trans>最終使用日時</Trans>
                  </span>
                  <span className="text-text-secondary">
                    {apiKey.lastRequestAt === undefined ? (
                      <Trans>未使用</Trans>
                    ) : (
                      formatDateTime({
                        timestamp: apiKey.lastRequestAt,
                        locale,
                      })
                    )}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <ConfirmSheet
        isOpen={revokingKey !== undefined}
        onClose={() => setRevokingKey(undefined)}
        onConfirm={handleRevoke}
        title={t`API キーを失効`}
        message={
          revokingKey !== undefined
            ? t`「${revokingKey.name}」を失効します。失効したキーは復元できません。`
            : ""
        }
        confirmLabel={t`失効`}
        confirmVariant="danger"
      />
    </>
  );
};

export default ApiKeyList;
