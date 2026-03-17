"use client";

import { useSetAtom } from "jotai";
import { Eye, EyeOff, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
import { msg } from "@lingui/core/macro";
import type { Digest } from "@/types";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { markDigestReadAtom } from "@/stores/digestAtoms";

type Props = {
  readonly digest: Digest;
};

const formatDate = (timestamp: number, locale: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const DigestCard = ({ digest }: Props) => {
  const markRead = useSetAtom(markDigestReadAtom);
  const { i18n } = useLingui();
  const hasIssues = digest.unknownCount > 0 || digest.orphanedCount > 0;

  const handleMarkRead = async () => {
    if (!digest.isRead) {
      await markRead(digest.id);
    }
  };

  return (
    <Card
      className={
        digest.isRead ? "opacity-75" : "border-primary-100 bg-primary-50/30"
      }
    >
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-secondary">
          {formatDate(digest.generatedAt, i18n.locale)}
        </p>
        <div className="flex items-center gap-2">
          {!digest.isRead && (
            <Badge variant="primary">
              <Trans>未読</Trans>
            </Badge>
          )}
          <button
            type="button"
            onClick={handleMarkRead}
            disabled={digest.isRead}
            className="text-text-tertiary transition-colors hover:text-text-primary disabled:cursor-default disabled:opacity-50"
            aria-label={i18n._(digest.isRead ? msg`既読済み` : msg`既読にする`)}
          >
            {digest.isRead ? (
              <Eye className="size-4" />
            ) : (
              <EyeOff className="size-4" />
            )}
          </button>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {hasIssues ? (
          <>
            {digest.unknownCount > 0 && (
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                <div>
                  <p className="text-sm text-text-primary">
                    <Trans>
                      しばらく確認していない服が{digest.unknownCount}
                      着あります
                    </Trans>
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {digest.unknownItems.map((item) => (
                      <li
                        key={item.garmentId}
                        className="text-xs text-text-secondary"
                      >
                        {item.garmentName}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            {digest.orphanedCount > 0 && (
              <div className="flex items-start gap-2">
                <Clock className="mt-0.5 size-4 shrink-0 text-orange-500" />
                <div>
                  <p className="text-sm text-text-primary">
                    <Trans>
                      {digest.orphanedCount}
                      着が取り出されたままのようです
                    </Trans>
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {digest.orphanedItems.map((item) => (
                      <li
                        key={item.garmentId}
                        className="text-xs text-text-secondary"
                      >
                        {item.garmentName}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2">
            <CheckCircle className="size-4 text-emerald-500" />
            <p className="text-sm text-text-primary">
              <Trans>すべて確認済みです！ワードローブは良い状態です</Trans>
            </p>
          </div>
        )}
      </div>

      <div className="mt-3 border-t border-border-default pt-2">
        <p className="text-xs text-text-tertiary">
          <Trans>管理中の服: {digest.totalGarments}着</Trans>
        </p>
      </div>
    </Card>
  );
};

export default DigestCard;
