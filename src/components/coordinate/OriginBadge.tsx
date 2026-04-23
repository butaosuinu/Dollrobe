import { Trans } from "@lingui/react/macro";
import Badge from "@/components/ui/Badge";

type Props = {
  readonly isAiGenerated: boolean;
};

const OriginBadge = ({ isAiGenerated }: Props) => (
  <Badge variant={isAiGenerated ? "primary" : "default"}>
    {isAiGenerated ? <Trans>AI</Trans> : <Trans>手動</Trans>}
  </Badge>
);

export default OriginBadge;
