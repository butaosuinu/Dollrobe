"use client";

import Link from "next/link";
import { useAtomValue } from "jotai";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { garmentsAtom } from "@/stores/garmentAtoms";
import { getOrphanedCheckouts } from "@/lib/confidence";
import Card from "@/components/ui/Card";

const AlertPanel = () => {
  const garments = useAtomValue(garmentsAtom);
  const orphaned = getOrphanedCheckouts(garments);
  const checkedOut = garments.filter((g) => g.status === "checked_out");

  if (checkedOut.length === 0) {
    return undefined;
  }

  return (
    <section>
      <Card
        className={
          orphaned.length > 0
            ? "border-amber-200 bg-amber-50/50"
            : "border-primary-100 bg-primary-50/50"
        }
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
              orphaned.length > 0 ? "bg-amber-100" : "bg-primary-100"
            }`}
          >
            <AlertTriangle
              className={`size-4 ${orphaned.length > 0 ? "text-amber-600" : "text-primary-500"}`}
            />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-text-primary">
              {orphaned.length > 0
                ? `${orphaned.length}着の服が3日以上取り出し中です`
                : `${checkedOut.length}着の服を取り出し中`}
            </p>
            <p className="mt-0.5 text-xs text-text-secondary">
              {orphaned.length > 0
                ? "収納場所を確認して状態を更新しましょう"
                : "QRスキャンで戻す場所を記録できます"}
            </p>
          </div>
          <Link
            href="/garments?status=checked_out"
            className="flex items-center gap-1 self-center text-xs font-medium text-primary-500 transition-colors hover:text-primary-600"
          >
            確認
            <ArrowRight className="size-3" />
          </Link>
        </div>
      </Card>
    </section>
  );
};

export default AlertPanel;
