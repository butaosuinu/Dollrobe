"use client";

import { useSetAtom } from "jotai";
import { Eye, EyeOff, Sparkles } from "lucide-react";
import { Plural, Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
import { msg } from "@lingui/core/macro";
import type { Digest } from "@/types";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import IconButton from "@/components/ui/IconButton";
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

const formatPercent = (score: number): number => Math.round(score * 100);

const DigestCard = ({ digest }: Props) => {
  const markRead = useSetAtom(markDigestReadAtom);
  const { i18n } = useLingui();
  const percent = formatPercent(digest.accuracyScore);

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
          <IconButton
            icon={digest.isRead ? Eye : EyeOff}
            label={i18n._(digest.isRead ? msg`既読済み` : msg`既読にする`)}
            size="sm"
            onClick={handleMarkRead}
            disabled={digest.isRead}
          />
        </div>
      </div>

      <div className="mt-3">
        <p className="text-sm text-text-secondary">
          <Trans>あなたの在庫状況</Trans>
        </p>
        <p className="mt-1 text-3xl font-semibold text-text-primary">
          <Trans>{percent}% 正確</Trans>
        </p>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-surface-raised p-2">
          <dt className="text-xs text-text-secondary">
            <Trans>確定</Trans>
          </dt>
          <dd className="text-base font-medium text-text-primary">
            {digest.confirmedCount}
          </dd>
        </div>
        <div className="rounded-lg bg-surface-raised p-2">
          <dt className="text-xs text-text-secondary">
            <Trans>要確認</Trans>
          </dt>
          <dd className="text-base font-medium text-text-primary">
            {digest.uncertainCount}
          </dd>
        </div>
        <div className="rounded-lg bg-surface-raised p-2">
          <dt className="text-xs text-text-secondary">
            <Trans>不明</Trans>
          </dt>
          <dd className="text-base font-medium text-text-primary">
            {digest.unknownCount}
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex items-start gap-2 rounded-lg bg-primary-50/60 p-2">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-primary-500" />
        <p className="text-xs text-text-secondary">
          <Trans>次に引き出しを開けたときに自動で確認されます</Trans>
        </p>
      </div>

      <div className="mt-3 border-t border-border-default pt-2">
        <p className="text-xs text-text-tertiary">
          <Plural
            value={digest.totalGarments}
            one="管理中の服: #着"
            other="管理中の服: #着"
          />
        </p>
      </div>
    </Card>
  );
};

export default DigestCard;
