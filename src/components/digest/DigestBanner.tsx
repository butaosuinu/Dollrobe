"use client";

import Link from "next/link";
import { useAtomValue } from "jotai";
import { Mail, ArrowRight } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { hasUnreadDigestAtom } from "@/stores/digestAtoms";
import Card from "@/components/ui/Card";

const DigestBanner = () => {
  const hasUnread = useAtomValue(hasUnreadDigestAtom);

  if (!hasUnread) {
    return undefined;
  }

  return (
    <section>
      <Card className="border-primary-200 bg-primary-50/50">
        <Link href="/digest" className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-100">
            <Mail className="size-4 text-primary-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-text-primary">
              <Trans>新しい週間レポートが届いています</Trans>
            </p>
            <p className="mt-0.5 text-xs text-text-secondary">
              <Trans>タップして確認する</Trans>
            </p>
          </div>
          <ArrowRight className="size-4 text-primary-400" />
        </Link>
      </Card>
    </section>
  );
};

export default DigestBanner;
