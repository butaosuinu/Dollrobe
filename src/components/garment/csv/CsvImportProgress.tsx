"use client";

import { useRouter } from "next/navigation";
import { CircleCheck, CircleAlert, Loader2 } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import Button from "@/components/ui/Button";

type Props = {
  readonly progress: { readonly completed: number; readonly total: number };
  readonly result:
    | { readonly succeeded: number; readonly failed: number }
    | undefined;
  readonly isDone: boolean;
  readonly onReset: () => void;
};

const CsvImportProgress = ({ progress, result, isDone, onReset }: Props) => {
  const router = useRouter();
  const percentage =
    progress.total > 0
      ? Math.round((progress.completed / progress.total) * 100)
      : 0;

  return isDone && result !== undefined ? (
    <div className="flex flex-col items-center gap-6 py-8">
      {result.failed === 0 ? (
        <CircleCheck className="size-16 text-success" />
      ) : (
        <CircleAlert className="size-16 text-warning" />
      )}
      <div className="text-center">
        <h3 className="text-lg font-bold">
          <Trans>インポート完了</Trans>
        </h3>
        <p className="mt-2 text-sm text-text-secondary">
          <Trans>{result.succeeded}件の登録に成功しました</Trans>
        </p>
        {result.failed > 0 && (
          <p className="mt-1 text-sm text-danger">
            <Trans>{result.failed}件の登録に失敗しました</Trans>
          </p>
        )}
      </div>
      <div className="flex gap-3">
        <Button
          variant="secondary"
          onClick={() => {
            router.push("/garments");
          }}
        >
          <Trans>ワードローブを見る</Trans>
        </Button>
        <Button onClick={onReset}>
          <Trans>続けてインポート</Trans>
        </Button>
      </div>
    </div>
  ) : (
    <div className="flex flex-col items-center gap-6 py-8">
      <Loader2 className="size-12 animate-spin text-primary-500" />
      <div className="w-full max-w-xs">
        <div className="flex justify-between text-sm text-text-secondary">
          <span>
            <Trans>インポート中...</Trans>
          </span>
          <span>
            {progress.completed}/{progress.total}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-overlay">
          <div
            className="h-full rounded-full bg-primary-500 transition-all duration-300"
            style={{ width: `${String(percentage)}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default CsvImportProgress;
