"use client";

import { Trans } from "@lingui/react/macro";
import { AlertTriangle, Nfc } from "lucide-react";
import type { NfcReaderState } from "@/hooks/useNfcReader";
import Card from "@/components/ui/Card";

type Props = {
  readonly nfcState: NfcReaderState;
};

const NfcReader = ({ nfcState }: Props) => {
  if (nfcState.status === "idle" || nfcState.status === "unsupported") {
    return undefined;
  }

  if (nfcState.status === "scanning") {
    return (
      <Card className="border-primary-200 bg-primary-50/50">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary-100">
            <Nfc className="size-5 animate-pulse text-primary-600" />
          </div>
          <p className="text-sm font-bold text-text-primary">
            <Trans>NFC 待ち受け中...</Trans>
          </p>
        </div>
      </Card>
    );
  }

  const message =
    nfcState.status === "permission_denied" ? (
      <Trans>NFC の権限が拒否されました</Trans>
    ) : (
      nfcState.message
    );

  return (
    <Card>
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-surface-secondary">
          <AlertTriangle className="size-5 text-text-secondary" />
        </div>
        <p className="text-sm text-text-secondary">{message}</p>
      </div>
    </Card>
  );
};

export default NfcReader;
