import { Pencil, Trash2 } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import type { Garment, StorageCase, StorageLocation } from "@/types";
import { getConfidence } from "@/lib/confidence";
import { CONFIDENCE_THRESHOLD, GARMENT_STATUS } from "@/lib/constants";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import IconButton from "@/components/ui/IconButton";
import StorageGrid from "@/components/location/StorageGrid";

type Props = {
  readonly storageCase: StorageCase;
  readonly locations: readonly StorageLocation[];
  readonly garments: readonly Garment[];
  readonly onEdit: () => void;
  readonly onDelete: () => void;
};

const StorageCaseCard = ({
  storageCase,
  locations,
  garments,
  onEdit,
  onDelete,
}: Props) => {
  const locationIds = new Set(locations.map((l) => l.id));
  const caseGarments = garments.filter(
    (g) => g.locationId !== undefined && locationIds.has(g.locationId),
  );
  const needsReviewCount = caseGarments.filter(
    (g) =>
      g.status === GARMENT_STATUS.STORED &&
      getConfidence(g) < CONFIDENCE_THRESHOLD.CONFIRMED,
  ).length;

  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-display text-base font-bold">{storageCase.name}</h3>
        <div className="flex items-center gap-1">
          <IconButton
            icon={Pencil}
            label={t`編集`}
            size="sm"
            onClick={onEdit}
          />
          <IconButton
            icon={Trash2}
            label={t`削除`}
            size="sm"
            variant="danger"
            onClick={onDelete}
          />
        </div>
      </div>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xs text-text-tertiary">
          <Trans>
            {storageCase.rows}行 x {storageCase.cols}列
          </Trans>
        </span>
        <Badge>{t`${caseGarments.length}着`}</Badge>
        {needsReviewCount > 0 && (
          <Badge variant="uncertain">{t`${needsReviewCount}着 要確認`}</Badge>
        )}
      </div>
      <StorageGrid
        storageCase={storageCase}
        locations={locations}
        garments={garments}
      />
    </Card>
  );
};

export default StorageCaseCard;
