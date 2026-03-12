"use client";

import { Plus, X } from "lucide-react";
import clsx from "clsx";

type Props = {
  readonly label?: string;
  readonly colors: readonly string[];
  readonly onChangeColors: (colors: readonly string[]) => void;
};

const PRESET_COLORS = [
  "hsl(0, 0%, 10%)",
  "hsl(0, 0%, 95%)",
  "hsl(0, 70%, 55%)",
  "hsl(210, 70%, 55%)",
  "hsl(120, 40%, 45%)",
  "hsl(45, 90%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(330, 70%, 60%)",
  "hsl(25, 70%, 50%)",
  "hsl(180, 50%, 45%)",
] as const;

const ColorPicker = ({ label, colors, onChangeColors }: Props) => {
  const addColor = (color: string) => {
    if (!colors.includes(color)) {
      onChangeColors([...colors, color]);
    }
  };

  const removeColor = (color: string) => {
    onChangeColors(colors.filter((c) => c !== color));
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label !== undefined && (
        <span className="text-sm font-medium text-text-secondary">{label}</span>
      )}

      {colors.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {colors.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => {
                removeColor(color);
              }}
              className="group relative size-8 rounded-full border-2 border-border-default transition-transform hover:scale-110"
              style={{ backgroundColor: color }}
              aria-label={`${color}を削除`}
            >
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <X className="size-3 text-white" />
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {PRESET_COLORS.filter((c) => !colors.includes(c)).map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => {
              addColor(color);
            }}
            className={clsx(
              "size-7 rounded-full border border-border-default transition-transform hover:scale-110",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500",
            )}
            style={{ backgroundColor: color }}
            aria-label={`${color}を追加`}
          />
        ))}
        <label
          className={clsx(
            "flex size-7 cursor-pointer items-center justify-center rounded-full border border-dashed border-border-strong transition-colors hover:bg-primary-50",
          )}
        >
          <Plus className="size-3 text-text-tertiary" />
          <input
            type="color"
            className="sr-only"
            onChange={(e) => {
              addColor(e.target.value);
            }}
          />
        </label>
      </div>
    </div>
  );
};

export default ColorPicker;
