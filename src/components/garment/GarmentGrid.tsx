import type { Garment } from "@/types";
import GarmentCard from "@/components/garment/GarmentCard";

type Props = {
  readonly garments: readonly Garment[];
};

const GarmentGrid = ({ garments }: Props) => (
  <div className="grid grid-cols-2 gap-3">
    {garments.map((garment, i) => (
      <div
        key={garment.id}
        className="animate-[slide-up_0.3s_ease-out_both]"
        style={{ animationDelay: `${i * 50}ms` }}
      >
        <GarmentCard garment={garment} />
      </div>
    ))}
  </div>
);

export default GarmentGrid;
