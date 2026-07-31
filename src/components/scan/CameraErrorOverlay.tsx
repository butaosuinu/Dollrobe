"use client";

import { Trans } from "@lingui/react/macro";
import { CameraOff, RefreshCw } from "lucide-react";
import type { CameraErrorKind } from "@/lib/camera/cameraError";
import Button from "@/components/ui/Button";

type CameraErrorCopy = {
  readonly title: React.ReactNode;
  readonly description: React.ReactNode;
};

const getCameraErrorCopy = (kind: CameraErrorKind): CameraErrorCopy => {
  if (kind === "permission_denied") {
    return {
      title: <Trans>カメラへのアクセスが拒否されました</Trans>,
      description: (
        <Trans>
          アドレスバーのカメラアイコン、または端末の設定からこのサイトのカメラを「許可」に変更してください。
        </Trans>
      ),
    };
  }

  if (kind === "not_found") {
    return {
      title: <Trans>利用できるカメラが見つかりません</Trans>,
      description: (
        <Trans>
          カメラが接続されているか、他のアプリで無効になっていないか確認してください。
        </Trans>
      ),
    };
  }

  if (kind === "in_use") {
    return {
      title: <Trans>カメラを起動できませんでした</Trans>,
      description: (
        <Trans>
          他のアプリがカメラを使用している可能性があります。使用中のアプリを閉じてから再試行してください。
        </Trans>
      ),
    };
  }

  if (kind === "unsupported") {
    return {
      title: <Trans>このブラウザではカメラを使えません</Trans>,
      description: (
        <Trans>
          HTTPS でアクセスしているか確認するか、別のブラウザで開いてください。
        </Trans>
      ),
    };
  }

  return {
    title: <Trans>カメラの起動に失敗しました</Trans>,
    description: <Trans>しばらく待ってから再試行してください。</Trans>,
  };
};

type Props = {
  readonly kind: CameraErrorKind;
  readonly onRetry: () => void;
};

const CameraErrorOverlay = ({ kind, onRetry }: Props) => {
  const { title, description } = getCameraErrorCopy(kind);

  return (
    <div
      role="alert"
      className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 px-6 text-center"
    >
      <CameraOff className="size-8 text-white/70" />
      <p className="text-sm font-bold text-white">{title}</p>
      <p className="text-xs leading-relaxed text-white/70">{description}</p>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        <RefreshCw className="size-4" />
        <Trans>カメラを再試行</Trans>
      </Button>
    </div>
  );
};

export default CameraErrorOverlay;
