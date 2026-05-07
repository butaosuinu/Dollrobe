"use client";

import { useRouter } from "next/navigation";
import { CircleCheck, CircleAlert, Loader2 } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import type { BulkRegistrationStatus } from "@/types";
import Button from "@/components/ui/Button";

type Props = {
  readonly status: BulkRegistrationStatus;
  readonly onReset: () => void;
};

const BulkRegistrationProgress = ({ status, onReset }: Props) => {
  const router = useRouter();

  if (status.status === "done") {
    return (
      <div className="flex flex-col items-center gap-6 py-8">
        {status.failed === 0 ? (
          <CircleCheck className="size-16 text-success" />
        ) : (
          <CircleAlert className="size-16 text-warning" />
        )}
        <div className="text-center">
          <h3 className="text-lg font-bold">
            <Trans>登録完了</Trans>
          </h3>
          <p className="mt-2 text-sm text-text-secondary">
            <Trans>{status.succeeded}件の登録に成功しました</Trans>
          </p>
          {status.failed > 0 && (
            <p className="mt-1 text-sm text-danger">
              <Trans>{status.failed}件の登録に失敗しました</Trans>
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
            <Trans>続けて撮影する</Trans>
          </Button>
        </div>
      </div>
    );
  }

  if (status.status === "error") {
    return (
      <div className="flex flex-col items-center gap-6 py-8">
        <CircleAlert className="size-16 text-danger" />
        <div className="text-center">
          <h3 className="text-lg font-bold">
            <Trans>登録できませんでした</Trans>
          </h3>
          <p className="mt-2 text-sm text-text-secondary">{status.message}</p>
        </div>
        <Button onClick={onReset}>
          <Trans>最初からやり直す</Trans>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <Loader2 className="size-12 animate-spin text-primary-500" />
      <div className="text-center">
        <h3 className="text-lg font-bold">
          <Trans>一括登録中...</Trans>
        </h3>
        {status.status === "registering" && (
          <p className="mt-2 text-sm text-text-secondary">
            <Trans>
              画像をアップロードしています ({status.completed}/{status.total})
            </Trans>
          </p>
        )}
      </div>
    </div>
  );
};

export default BulkRegistrationProgress;
