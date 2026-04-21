import type { Garment, GarmentCategory, DollSize } from "@/types";
import type { ColorName } from "@/lib/constants";
import { GARMENT_CATEGORIES, DOLL_SIZES } from "@/lib/constants";
import { PRESET_COLORS } from "@/lib/color/presets";

type ParsedHsl = {
  readonly h: number;
  readonly s: number;
  readonly l: number;
};

export type CategoryCount = {
  readonly category: GarmentCategory;
  readonly count: number;
};

export type DollSizeCount = {
  readonly dollSize: DollSize;
  readonly count: number;
};

export type ColorGroupCount = {
  readonly colorName: ColorName;
  readonly hsl: string;
  readonly count: number;
};

export type BrandCount = {
  readonly brand: string;
  readonly count: number;
};

const COLOR_NAME_MAP: ReadonlyMap<string, ColorName> = new Map([
  [PRESET_COLORS[0], "black"],
  [PRESET_COLORS[1], "white"],
  [PRESET_COLORS[2], "red"],
  [PRESET_COLORS[3], "blue"],
  [PRESET_COLORS[4], "green"],
  [PRESET_COLORS[5], "yellow"],
  [PRESET_COLORS[6], "purple"],
  [PRESET_COLORS[7], "pink"],
  [PRESET_COLORS[8], "orange"],
  [PRESET_COLORS[9], "cyan"],
]);

const HUE_PRESETS: ReadonlyArray<{
  readonly hue: number;
  readonly name: ColorName;
}> = [
  { hue: 0, name: "red" },
  { hue: 25, name: "orange" },
  { hue: 45, name: "yellow" },
  { hue: 120, name: "green" },
  { hue: 180, name: "cyan" },
  { hue: 210, name: "blue" },
  { hue: 280, name: "purple" },
  { hue: 330, name: "pink" },
];

const ACHROMATIC_SATURATION_THRESHOLD = 15;
const ACHROMATIC_LIGHTNESS_MIDPOINT = 50;

const DEFAULT_BRAND_TOP_N = 10;

export const parseHsl = (hslString: string): ParsedHsl | undefined => {
  const trimmed = hslString.trim();
  return trimmed.startsWith("hsl(") && trimmed.endsWith(")")
    ? parseHslInner(trimmed.slice(4, -1))
    : undefined;
};

const parseHslInner = (inner: string): ParsedHsl | undefined => {
  const parts = inner.split(",").map((s) => s.trim());
  return parts.length === 3 ? parseHslParts(parts) : undefined;
};

const parseNumPercent = (str: string | undefined): number =>
  str?.endsWith("%") === true ? Number(str.slice(0, -1)) : Number.NaN;

const parseHslParts = (parts: readonly string[]): ParsedHsl | undefined => {
  const h = Number(parts[0]);
  const s = parseNumPercent(parts[1]);
  const l = parseNumPercent(parts[2]);
  return Number.isNaN(h) || Number.isNaN(s) || Number.isNaN(l)
    ? undefined
    : { h, s, l };
};

const parseHex = (hex: string): ParsedHsl | undefined => {
  const cleaned = hex.startsWith("#") ? hex.slice(1) : hex;
  return cleaned.length === 3 || cleaned.length === 6
    ? parseHexDigits(
        cleaned.length === 3
          ? cleaned
              .split("")
              .map((c) => c + c)
              .join("")
          : cleaned,
      )
    : undefined;
};

const parseHexDigits = (full: string): ParsedHsl | undefined => {
  const num = Number.parseInt(full, 16);
  return Number.isNaN(num) ? undefined : rgbToHsl(num);
};

const rgbToHsl = (num: number): ParsedHsl => {
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  return max === min
    ? { h: 0, s: 0, l: l * 100 }
    : computeChromatic({ r, g, b, max }, min, l);
};

type RgbChannels = {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly max: number;
};

const computeChromatic = (
  { r, g, b, max }: RgbChannels,
  min: number,
  l: number,
): ParsedHsl => {
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const hRaw =
    max === r
      ? ((g - b) / d + (g < b ? 6 : 0)) / 6
      : max === g
        ? ((b - r) / d + 2) / 6
        : ((r - g) / d + 4) / 6;

  return { h: hRaw * 360, s: s * 100, l: l * 100 };
};

const hueDistance = (h1: number, h2: number): number => {
  const diff = Math.abs(h1 - h2);
  return Math.min(diff, 360 - diff);
};

const findClosestHuePreset = (hue: number): ColorName =>
  HUE_PRESETS.reduce<{ readonly name: ColorName; readonly dist: number }>(
    (best, preset) => {
      const dist = hueDistance(hue, preset.hue);
      return dist < best.dist ? { name: preset.name, dist } : best;
    },
    { name: "red", dist: Infinity },
  ).name;

export const classifyColor = (colorString: string): ColorName =>
  COLOR_NAME_MAP.get(colorString) ??
  classifyParsed(parseHsl(colorString) ?? parseHex(colorString));

const classifyParsed = (parsed: ParsedHsl | undefined): ColorName =>
  parsed === undefined
    ? "black"
    : parsed.s < ACHROMATIC_SATURATION_THRESHOLD
      ? parsed.l < ACHROMATIC_LIGHTNESS_MIDPOINT
        ? "black"
        : "white"
      : findClosestHuePreset(parsed.h);

const COLOR_NAME_TO_HSL: Readonly<Record<ColorName, string>> = {
  black: PRESET_COLORS[0],
  white: PRESET_COLORS[1],
  red: PRESET_COLORS[2],
  blue: PRESET_COLORS[3],
  green: PRESET_COLORS[4],
  yellow: PRESET_COLORS[5],
  purple: PRESET_COLORS[6],
  pink: PRESET_COLORS[7],
  orange: PRESET_COLORS[8],
  cyan: PRESET_COLORS[9],
};

/* eslint-disable functional/no-loop-statements, functional/no-expression-statements, functional/immutable-data -- O(n) accumulation; pure from the outside */
const countBy = <T, K extends string>(
  items: readonly T[],
  keyFn: (item: T) => K,
): ReadonlyMap<K, number> => {
  const map = new Map<K, number>();
  for (const item of items) {
    const key = keyFn(item);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
};

const countByFlat = <T, K extends string>(
  items: readonly T[],
  keysFn: (item: T) => readonly K[],
): ReadonlyMap<K, number> => {
  const map = new Map<K, number>();
  for (const item of items) {
    for (const key of keysFn(item)) {
      map.set(key, (map.get(key) ?? 0) + 1);
    }
  }
  return map;
};
/* eslint-enable functional/no-loop-statements, functional/no-expression-statements, functional/immutable-data */

export const aggregateByCategory = (
  garments: readonly Garment[],
): readonly CategoryCount[] => {
  const countMap = countBy(garments, (g) => g.category);

  return GARMENT_CATEGORIES.filter((cat) => (countMap.get(cat) ?? 0) > 0)
    .map((cat) => ({ category: cat, count: countMap.get(cat) ?? 0 }))
    .sort((a, b) => b.count - a.count);
};

export const aggregateByDollSize = (
  garments: readonly Garment[],
): readonly DollSizeCount[] => {
  const countMap = countByFlat(garments, (g) => g.dollSizes);

  return DOLL_SIZES.filter((size) => (countMap.get(size) ?? 0) > 0)
    .map((size) => ({ dollSize: size, count: countMap.get(size) ?? 0 }))
    .sort((a, b) => b.count - a.count);
};

export const aggregateByColor = (
  garments: readonly Garment[],
): readonly ColorGroupCount[] => {
  const countMap = countByFlat(garments, (g) =>
    g.colors.map((c) => classifyColor(c)),
  );

  return Array.from(countMap.entries())
    .map(([colorName, count]) => ({
      colorName,
      hsl: COLOR_NAME_TO_HSL[colorName],
      count,
    }))
    .sort((a, b) => b.count - a.count);
};

export const aggregateByBrand = ({
  garments,
  topN = DEFAULT_BRAND_TOP_N,
}: {
  readonly garments: readonly Garment[];
  readonly topN?: number;
}): readonly BrandCount[] => {
  const brands = garments
    .map((g) => g.brand)
    .filter((b): b is string => b !== undefined && b !== "");
  const countMap = countBy(brands, (b) => b);

  return Array.from(countMap.entries())
    .map(([brand, count]) => ({ brand, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
};
