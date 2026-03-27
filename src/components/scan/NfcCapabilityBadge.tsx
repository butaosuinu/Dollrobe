"use client";

import { Trans } from "@lingui/react/macro";
import { Nfc } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { useNfcSupported } from "@/hooks/useNfcSupported";

const NfcCapabilityBadge = () => {
  const supported = useNfcSupported();

  return (
    <Badge variant={supported ? "confirmed" : "default"}>
      <Nfc className="size-3" />
      {supported ? <Trans>NFC 対応</Trans> : <Trans>NFC 非対応</Trans>}
    </Badge>
  );
};

export default NfcCapabilityBadge;
