"use client";

import { CircleAlert, CircleCheck } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import type { CsvValidationResult } from "@/types";
import Button from "@/components/ui/Button";

type Props = {
  readonly results: readonly CsvValidationResult[];
  readonly onConfirm: () => void;
  readonly onBack: () => void;
};

const CsvPreviewTable = ({ results, onConfirm, onBack }: Props) => {
  const validCount = results.filter((r) => r.ok).length;
  const errorCount = results.length - validCount;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4 rounded-lg bg-surface-overlay p-4">
        <div className="flex items-center gap-2">
          <CircleCheck className="size-5 text-success" />
          <span className="text-sm font-medium">
            <Trans>{validCount}件 有効</Trans>
          </span>
        </div>
        {errorCount > 0 && (
          <div className="flex items-center gap-2">
            <CircleAlert className="size-5 text-danger" />
            <span className="text-sm font-medium">
              <Trans>{errorCount}件 エラー</Trans>
            </span>
          </div>
        )}
      </div>

      <div className="max-h-96 overflow-auto rounded-lg border border-border-default">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-surface-overlay text-xs text-text-secondary">
            <tr>
              <th className="px-3 py-2">{t`行`}</th>
              <th className="px-3 py-2">{t`状態`}</th>
              <th className="px-3 py-2">{t`名前`}</th>
              <th className="px-3 py-2">{t`カテゴリ`}</th>
              <th className="px-3 py-2">{t`サイズ`}</th>
              <th className="px-3 py-2">{t`詳細`}</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result, index) => (
              <tr
                key={index}
                className="border-t border-border-default hover:bg-surface-overlay/50"
              >
                <td className="px-3 py-2 text-text-tertiary">{index + 1}</td>
                <td className="px-3 py-2">
                  {result.ok ? (
                    <CircleCheck className="size-4 text-success" />
                  ) : (
                    <CircleAlert className="size-4 text-danger" />
                  )}
                </td>
                <td className="px-3 py-2">
                  {result.ok ? result.data.name : "—"}
                </td>
                <td className="px-3 py-2">
                  {result.ok ? result.data.category : "—"}
                </td>
                <td className="px-3 py-2">
                  {result.ok ? result.data.dollSize : "—"}
                </td>
                <td className="px-3 py-2">
                  {result.ok ? (
                    <span className="text-text-tertiary">—</span>
                  ) : (
                    <ul className="list-inside list-disc text-xs text-danger">
                      {result.errors.map((err, errIdx) => (
                        <li key={errIdx}>
                          {err.field}: {err.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack}>
          <Trans>戻る</Trans>
        </Button>
        <Button onClick={onConfirm} disabled={validCount === 0} fullWidth>
          <Trans>{validCount}件をインポート</Trans>
        </Button>
      </div>
    </div>
  );
};

export default CsvPreviewTable;
