import { useLingui } from "@lingui/react/macro";
import clsx from "clsx";

export type BarItem = {
  readonly label: string;
  readonly value: number;
  readonly color?: string;
  readonly swatch?: string;
};

type Props = {
  readonly items: readonly BarItem[];
};

const HorizontalBarChart = ({ items }: Props) => {
  const { t } = useLingui();

  if (items.length === 0) return undefined;

  const maxValue = Math.max(...items.map((item) => item.value));

  return (
    <div className="flex flex-col gap-2.5">
      {items.map((item) => {
        const percentage =
          maxValue > 0 ? Math.round((item.value / maxValue) * 100) : 0;

        return (
          <div key={item.label} className="flex items-center gap-2">
            <div className="flex w-24 shrink-0 items-center gap-1.5 truncate">
              {item.swatch !== undefined && (
                <span
                  className="inline-block size-3 shrink-0 rounded-full border border-border-default"
                  style={{ backgroundColor: item.swatch }}
                />
              )}
              <span className="truncate text-xs text-text-secondary">
                {item.label}
              </span>
            </div>
            <div className="h-5 flex-1 overflow-hidden rounded bg-border-default/30">
              <div
                className={clsx(
                  "h-full rounded transition-all duration-300",
                  item.color === undefined && "bg-primary-300",
                )}
                style={{
                  width: `${percentage}%`,
                  ...(item.color !== undefined
                    ? { backgroundColor: item.color }
                    : {}),
                }}
                role="progressbar"
                aria-valuenow={item.value}
                aria-valuemin={0}
                aria-valuemax={maxValue}
                aria-label={t`${item.label} ${item.value}`}
              />
            </div>
            <span className="min-w-[3ch] text-right text-xs font-medium text-text-secondary">
              {item.value}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default HorizontalBarChart;
