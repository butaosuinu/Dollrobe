import { Trans } from "@lingui/react/macro";
import type { Doll } from "@/types";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";

type Props = {
  readonly doll: Doll;
};

const DollDetailInfoCard = ({ doll }: Props) => {
  const hasDetailInfo =
    doll.headModel !== undefined ||
    doll.maker !== undefined ||
    doll.customizer !== undefined ||
    doll.memo !== undefined;

  if (!hasDetailInfo) {
    return undefined;
  }

  return (
    <Card>
      <dl className="flex flex-col gap-3">
        {doll.headModel !== undefined && (
          <div>
            <dt className="mb-1 text-sm font-medium text-text-secondary">
              <Trans>ヘッド型番</Trans>
            </dt>
            <dd>
              <Badge variant="primary">{doll.headModel}</Badge>
            </dd>
          </div>
        )}
        {doll.maker !== undefined && (
          <div>
            <dt className="mb-1 text-sm font-medium text-text-secondary">
              <Trans>メーカー</Trans>
            </dt>
            <dd>
              <Badge variant="primary">{doll.maker}</Badge>
            </dd>
          </div>
        )}
        {doll.customizer !== undefined && (
          <div>
            <dt className="mb-1 text-sm font-medium text-text-secondary">
              <Trans>カスタマイザー</Trans>
            </dt>
            <dd>
              <Badge variant="primary">{doll.customizer}</Badge>
            </dd>
          </div>
        )}
        {doll.memo !== undefined && (
          <div>
            <dt className="mb-1 text-sm font-medium text-text-secondary">
              <Trans>メモ</Trans>
            </dt>
            <dd className="whitespace-pre-wrap text-sm text-text-primary">
              {doll.memo}
            </dd>
          </div>
        )}
      </dl>
    </Card>
  );
};

export default DollDetailInfoCard;
