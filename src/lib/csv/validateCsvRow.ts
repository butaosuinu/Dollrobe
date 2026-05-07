import type { CsvRowValidationError, CsvValidationResult } from "@/types";
import {
  GARMENT_CATEGORIES,
  DOLL_SIZES,
  DEFAULT_CONFIDENCE_DECAY_DAYS,
  CSV_IMPORT,
} from "@/lib/constants";
import { isGarmentCategory, isDollSize } from "@/lib/typeGuards";

const GARMENT_NAME_MAX_LENGTH = 100;
const BRAND_MAX_LENGTH = 100;
const CONFIDENCE_DECAY_MIN = 1;
const CONFIDENCE_DECAY_MAX = 365;

type FieldValidator = (
  record: Record<string, string>,
  rowNumber: number,
) => readonly CsvRowValidationError[];

const validateName: FieldValidator = (record, rowNumber) => {
  const name = record.name?.trim() ?? "";
  return [
    ...(name === ""
      ? [{ row: rowNumber, field: "name", message: "名前は必須です" }]
      : []),
    ...(name !== "" && name.length > GARMENT_NAME_MAX_LENGTH
      ? [
          {
            row: rowNumber,
            field: "name",
            message: `名前は${String(GARMENT_NAME_MAX_LENGTH)}文字以内にしてください`,
          },
        ]
      : []),
  ];
};

const validateCategory: FieldValidator = (record, rowNumber) => {
  const value = record.category?.trim() ?? "";
  return [
    ...(value === ""
      ? [{ row: rowNumber, field: "category", message: "カテゴリは必須です" }]
      : []),
    ...(value !== "" && !isGarmentCategory(value)
      ? [
          {
            row: rowNumber,
            field: "category",
            message: `無効なカテゴリです。有効な値: ${GARMENT_CATEGORIES.join(", ")}`,
          },
        ]
      : []),
  ];
};

const validateDollSize: FieldValidator = (record, rowNumber) => {
  const value = record.dollSize?.trim() ?? "";
  return [
    ...(value === ""
      ? [
          {
            row: rowNumber,
            field: "dollSize",
            message: "ドールサイズは必須です",
          },
        ]
      : []),
    ...(value !== "" && !isDollSize(value)
      ? [
          {
            row: rowNumber,
            field: "dollSize",
            message: `無効なドールサイズです。有効な値: ${DOLL_SIZES.join(", ")}`,
          },
        ]
      : []),
  ];
};

const validateBrand: FieldValidator = (record, rowNumber) => {
  const value = record.brand?.trim() ?? "";
  return value.length > BRAND_MAX_LENGTH
    ? [
        {
          row: rowNumber,
          field: "brand",
          message: `ブランドは${String(BRAND_MAX_LENGTH)}文字以内にしてください`,
        },
      ]
    : [];
};

const validateDecayDays: FieldValidator = (record, rowNumber) => {
  const value = record.confidenceDecayDays?.trim() ?? "";
  const num = Number(value);
  return value !== "" &&
    (!Number.isInteger(num) ||
      num < CONFIDENCE_DECAY_MIN ||
      num > CONFIDENCE_DECAY_MAX)
    ? [
        {
          row: rowNumber,
          field: "confidenceDecayDays",
          message: `減衰期間は${String(CONFIDENCE_DECAY_MIN)}〜${String(CONFIDENCE_DECAY_MAX)}の整数にしてください`,
        },
      ]
    : [];
};

const VALIDATORS: readonly FieldValidator[] = [
  validateName,
  validateCategory,
  validateDollSize,
  validateBrand,
  validateDecayDays,
];

const parseArrayField = (value: string | undefined): readonly string[] => {
  const trimmed = value?.trim() ?? "";
  return trimmed === ""
    ? []
    : trimmed.split(CSV_IMPORT.PIPE_SEPARATOR).map((s) => s.trim());
};

const parseDecayDays = (value: string | undefined): number => {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? DEFAULT_CONFIDENCE_DECAY_DAYS : Number(trimmed);
};

const buildValidRow = (record: Record<string, string>): CsvValidationResult => {
  const category = GARMENT_CATEGORIES.find(
    (c) => c === (record.category?.trim() ?? ""),
  );
  const dollSize = DOLL_SIZES.find(
    (s) => s === (record.dollSize?.trim() ?? ""),
  );

  if (category === undefined || dollSize === undefined) {
    return {
      ok: false,
      errors: [
        {
          row: 0,
          field: "internal",
          message: "Unexpected validation error",
        },
      ],
    };
  }

  return {
    ok: true,
    data: {
      name: record.name?.trim() ?? "",
      category,
      dollSize,
      colors: parseArrayField(record.colors),
      tags: parseArrayField(record.tags),
      brand: record.brand?.trim() ?? "",
      confidenceDecayDays: parseDecayDays(record.confidenceDecayDays),
    },
  };
};

export const validateCsvRow = ({
  record,
  rowNumber,
}: {
  readonly record: Record<string, string>;
  readonly rowNumber: number;
}): CsvValidationResult => {
  const errors = VALIDATORS.flatMap((validator) =>
    validator(record, rowNumber),
  );

  return errors.length > 0 ? { ok: false, errors } : buildValidRow(record);
};

export const generateSampleCsv = (): string => {
  const header = CSV_IMPORT.ALL_HEADERS.join(",");
  const sampleRows = [
    'レースドレス,dress,MSD,"hsl(0,0%,100%)|hsl(350,80%,60%)",レース|フォーマル,ボークス,30',
    "デニムパンツ,bottoms,SD,,,アゾン,30",
  ];
  return [header, ...sampleRows].join("\n");
};
