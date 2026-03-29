"use client";

import Link from "next/link";
import { User } from "lucide-react";
import clsx from "clsx";
import { useLingui } from "@lingui/react";
import type { Doll } from "@/types";
import { DOLL_SIZE_LABEL } from "@/lib/i18n-labels";

type Props = {
  readonly dolls: readonly Doll[];
};

const DollList = ({ dolls }: Props) => {
  const { i18n } = useLingui();

  return (
    <div className="flex flex-col gap-2">
      {dolls.map((doll, i) => (
        <Link
          key={doll.id}
          href={`/dolls/${doll.id}`}
          className="animate-[slide-up_0.3s_ease-out_both]"
          style={{ animationDelay: `${i * 30}ms` }}
        >
          <div
            className={clsx(
              "flex items-center gap-3 rounded-xl border border-border-default bg-surface-overlay p-3 shadow-card",
              "transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0",
            )}
          >
            <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary-50">
              {doll.imageUrl !== undefined ? (
                <img
                  src={doll.imageUrl}
                  alt={doll.name}
                  className="size-full object-cover"
                />
              ) : (
                <User className="size-6 text-primary-200" />
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate font-display text-sm font-bold">
                {doll.name}
              </p>
              <p className="text-xs text-text-tertiary">
                {i18n._(DOLL_SIZE_LABEL[doll.bodySize])}
                {doll.headModel !== undefined && ` ・ ${doll.headModel}`}
                {doll.customizer !== undefined && ` ・ ${doll.customizer}`}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default DollList;
