import { PRESET_COLORS } from "@/lib/color/presets";

export type Hsl = {
  readonly h: number;
  readonly s: number;
  readonly l: number;
};

type OpencvHsv = {
  readonly h: number;
  readonly s: number;
  readonly v: number;
};

const COLOR_DISTANCE_WEIGHTS = Object.freeze({
  HUE: 1.0,
  SATURATION: 0.5,
  LIGHTNESS: 0.7,
});

export const opencvHsvToHsl = ({ h, s, v }: OpencvHsv): Hsl => {
  const hNorm = (h * 2) % 360;
  const sNorm = s / 255;
  const vNorm = v / 255;

  const l = vNorm * (1 - sNorm / 2);
  const sHsl = l === 0 || l === 1 ? 0 : (vNorm - l) / Math.min(l, 1 - l);

  return {
    h: Math.round(hNorm),
    s: Math.round(sHsl * 100),
    l: Math.round(l * 100),
  };
};

export const hslToString = ({ h, s, l }: Hsl): string =>
  `hsl(${h}, ${s}%, ${l}%)`;

const HSL_PREFIX = "hsl(";
const HSL_SUFFIX = ")";

export const parseHslString = (str: string): Hsl | undefined => {
  const isValid = str.startsWith(HSL_PREFIX) && str.endsWith(HSL_SUFFIX);
  return isValid ? parseHslInner(str) : undefined;
};

const parseHslInner = (str: string): Hsl | undefined => {
  const inner = str.slice(HSL_PREFIX.length, -HSL_SUFFIX.length);
  const parts = inner.split(",").map((p) => p.trim().replace("%", ""));
  const h = Number(parts[0]);
  const s = Number(parts[1]);
  const l = Number(parts[2]);
  return parts.length !== 3 ||
    Number.isNaN(h) ||
    Number.isNaN(s) ||
    Number.isNaN(l)
    ? undefined
    : { h, s, l };
};

export const hslDistance = ({
  a,
  b,
}: {
  readonly a: Hsl;
  readonly b: Hsl;
}): number => {
  const hueDiff = Math.min(Math.abs(a.h - b.h), 360 - Math.abs(a.h - b.h));
  const hueComponent = COLOR_DISTANCE_WEIGHTS.HUE * (hueDiff / 180) ** 2;
  const satComponent =
    COLOR_DISTANCE_WEIGHTS.SATURATION * ((a.s - b.s) / 100) ** 2;
  const lightComponent =
    COLOR_DISTANCE_WEIGHTS.LIGHTNESS * ((a.l - b.l) / 100) ** 2;
  return Math.sqrt(hueComponent + satComponent + lightComponent);
};

const parsePresetColor = (c: string): Hsl => {
  const parsed = parseHslString(c);
  return parsed ?? { h: 0, s: 0, l: 0 };
};

const PRESET_COLORS_HSL: readonly Hsl[] = PRESET_COLORS.map(parsePresetColor);

const ACHROMATIC_SAT_THRESHOLD_HSL = 15;
const ACHROMATIC_LIGHTNESS_MID = 50;
const BLACK_PRESET_INDEX = 0;
const WHITE_PRESET_INDEX = 1;

const mapAchromatic = (hsl: Hsl): string | undefined =>
  hsl.s < ACHROMATIC_SAT_THRESHOLD_HSL
    ? hsl.l < ACHROMATIC_LIGHTNESS_MID
      ? PRESET_COLORS[BLACK_PRESET_INDEX]
      : PRESET_COLORS[WHITE_PRESET_INDEX]
    : undefined;

export const findNearestPresetColor = ({
  hsl,
}: {
  readonly hsl: Hsl;
}): string => mapAchromatic(hsl) ?? findNearestByDistance(hsl);

const findNearestByDistance = (hsl: Hsl): string => {
  const distances = PRESET_COLORS_HSL.map((preset, index) => ({
    index,
    distance: hslDistance({ a: hsl, b: preset }),
  }));
  const nearest = distances.reduce((min, curr) =>
    curr.distance < min.distance ? curr : min,
  );
  return PRESET_COLORS[nearest.index] ?? PRESET_COLORS[0];
};

export const mapToPresetColors = ({
  colors,
}: {
  readonly colors: readonly Hsl[];
}): readonly string[] => {
  const mapped = colors.map((hsl) => findNearestPresetColor({ hsl }));
  return [...new Set(mapped)];
};
