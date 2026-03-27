import { CSV_IMPORT } from "@/lib/constants";

type ParsedCsvResult = {
  readonly headers: readonly string[];
  readonly rows: ReadonlyArray<readonly string[]>;
};

type SplitState = {
  readonly fields: readonly string[];
  readonly current: string;
  readonly inQuotes: boolean;
  readonly skipNext: boolean;
};

const QUOTE = '"';
const COMMA = ",";

const processChar = (
  state: SplitState,
  char: string,
  nextChar: string | undefined,
): SplitState =>
  state.skipNext
    ? { ...state, skipNext: false }
    : state.inQuotes
      ? char === QUOTE && nextChar === QUOTE
        ? { ...state, current: state.current + QUOTE, skipNext: true }
        : char === QUOTE
          ? { ...state, inQuotes: false }
          : { ...state, current: state.current + char }
      : char === QUOTE
        ? { ...state, inQuotes: true }
        : char === COMMA
          ? { ...state, fields: [...state.fields, state.current], current: "" }
          : { ...state, current: state.current + char };

const splitCsvLine = (line: string): readonly string[] => {
  const chars = Array.from(line);
  const initial: SplitState = {
    fields: [],
    current: "",
    inQuotes: false,
    skipNext: false,
  };

  const finalState = chars.reduce(
    (state, char, index) => processChar(state, char, chars[index + 1]),
    initial,
  );

  return [...finalState.fields, finalState.current];
};

export const parseCsv = (text: string): ParsedCsvResult => {
  const lines = text
    .split("\n")
    .map((line) => (line.endsWith("\r") ? line.slice(0, -1) : line))
    .filter((line) => line.trim() !== "");

  const [headerLine] = lines;
  return headerLine === undefined
    ? { headers: [], rows: [] }
    : {
        headers: splitCsvLine(headerLine).map((h) => h.trim()),
        rows: lines
          .slice(1)
          .map((line) => splitCsvLine(line).map((f) => f.trim())),
      };
};

export const hasRequiredHeaders = (
  headers: readonly string[],
): { readonly valid: boolean; readonly missing: readonly string[] } => {
  const missing = CSV_IMPORT.REQUIRED_HEADERS.filter(
    (required) => !headers.includes(required),
  );
  return { valid: missing.length === 0, missing };
};

export const mapRowToRecord = ({
  headers,
  row,
}: {
  readonly headers: readonly string[];
  readonly row: readonly string[];
}): Record<string, string> =>
  Object.fromEntries(
    headers.flatMap((header, index) =>
      row[index] === undefined ? [] : [[header, row[index]]],
    ),
  );
