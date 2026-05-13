import { Pencil, Trash2 } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { plural, t } from "@lingui/core/macro";
import type { Garment, StorageCase, StorageLocation } from "@/types";
import { getConfidence } from "@/lib/confidence";
import {
  CONFIDENCE_THRESHOLD,
  GARMENT_STATUS,
  STORAGE_CASE_TYPE,
} from "@/lib/constants";
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
  const visitedAtById = new Map(locations.map((l) => [l.id, l.lastVisitedAt]));
  const caseGarments = garments.filter(
    (g) => g.locationId !== undefined && locationIds.has(g.locationId),
  );
  const needsReviewCount = caseGarments.filter(
    (g) =>
      g.status === GARMENT_STATUS.STORED &&
      getConfidence({
        ...g,
        lastLocationVisitedAt:
          g.locationId !== undefined
            ? visitedAtById.get(g.locationId)
            : undefined,
      }) < CONFIDENCE_THRESHOLD.CONFIRMED,
  ).length;

  const isUnit = storageCase.type === STORAGE_CASE_TYPE.UNIT;

  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-bold">
            {storageCase.name}
          </h3>
          {storageCase.description !== undefined && (
            <p className="truncate text-xs text-text-tertiary">
              {storageCase.description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
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
          {isUnit ? (
            <Trans>ボックス</Trans>
          ) : (
            <Trans>
              {storageCase.rows}行 x {storageCase.cols}列
            </Trans>
          )}
        </span>
        <Badge>
          {plural(caseGarments.length, { one: "#着", other: "#着" })}
        </Badge>
        {needsReviewCount > 0 && (
          <Badge variant="uncertain">
            {plural(needsReviewCount, {
              one: "#着 要確認",
              other: "#着 要確認",
            })}
          </Badge>
        )}
      </div>
      {!isUnit && (
        <StorageGrid
          storageCase={storageCase}
          locations={locations}
          garments={garments}
        />
      )}
    </Card>
  );
};

export default StorageCaseCard;
