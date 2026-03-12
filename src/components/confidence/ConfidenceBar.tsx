import clsx from "clsx";
import { getConfidenceLabel } from "@/lib/confidence";

type Props = {
  readonly confidence: number;
};

const BAR_COLORS = {
  confirmed: "bg-confirmed",
  uncertain: "bg-uncertain",
  unknown: "bg-unknown",
} as const;

const ConfidenceBar = ({ confidence }: Props) => {
  const label = getConfidenceLabel(confidence);
  const percentage = Math.round(confidence * 100);

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-border-default">
        <div
          className={clsx(
            "h-full rounded-full transition-all",
            BAR_COLORS[label],
          )}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`信頼度 ${percentage}%`}
        />
      </div>
      <span className="min-w-[3ch] text-right text-xs font-medium text-text-secondary">
        {percentage}%
      </span>
    </div>
  );
};

export default ConfidenceBar;
