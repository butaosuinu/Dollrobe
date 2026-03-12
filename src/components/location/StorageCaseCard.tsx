import type { Garment, StorageCase, StorageLocation } from "@/types";
import Card from "@/components/ui/Card";
import StorageGrid from "@/components/location/StorageGrid";

type Props = {
  readonly storageCase: StorageCase;
  readonly locations: readonly StorageLocation[];
  readonly garments: readonly Garment[];
};

const StorageCaseCard = ({ storageCase, locations, garments }: Props) => (
  <Card>
    <div className="mb-3 flex items-center justify-between">
      <h3 className="font-display text-base font-bold">{storageCase.name}</h3>
      <span className="text-xs text-text-tertiary">
        {storageCase.rows}行 x {storageCase.cols}列
      </span>
    </div>
    <StorageGrid storageCase={storageCase} locations={locations} garments={garments} />
  </Card>
);

export default StorageCaseCard;
