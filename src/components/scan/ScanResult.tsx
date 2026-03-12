import { Check, MapPin, Shirt } from "lucide-react";
import Card from "@/components/ui/Card";

type ScanType = "garment" | "location";

type Props = {
  readonly type: ScanType;
  readonly name: string;
  readonly subtitle?: string;
};

const ICON_MAP = {
  garment: Shirt,
  location: MapPin,
} as const;

const ScanResult = ({ type, name, subtitle }: Props) => {
  const Icon = ICON_MAP[type];

  return (
    <Card className="animate-[slide-up_0.3s_ease-out] border-primary-200 bg-primary-50/50">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary-100">
          <Icon className="size-5 text-primary-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-text-primary">{name}</p>
          {subtitle !== undefined && <p className="text-xs text-text-secondary">{subtitle}</p>}
        </div>
        <div className="flex size-6 items-center justify-center rounded-full bg-confirmed">
          <Check className="size-3.5 text-white" />
        </div>
      </div>
    </Card>
  );
};

export default ScanResult;
