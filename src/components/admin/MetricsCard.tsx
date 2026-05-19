import type { LucideIcon } from "lucide-react";
import Card from "@/components/ui/Card";

type Props = {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly value: number;
  readonly hint?: string;
};

const MetricsCard = ({ icon: Icon, label, value, hint }: Props) => (
  <Card>
    <div className="flex items-start justify-between gap-3">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
          {label}
        </p>
        <p className="font-display text-2xl font-bold text-text-primary tabular-nums">
          {value.toLocaleString()}
        </p>
        {hint !== undefined && (
          <p className="text-xs text-text-tertiary">{hint}</p>
        )}
      </div>
      <div className="flex size-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
        <Icon className="size-5" />
      </div>
    </div>
  </Card>
);

export default MetricsCard;
