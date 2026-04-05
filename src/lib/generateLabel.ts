const ASCII_UPPER_A = 65;
const MAX_LABEL_ROWS = 26;

export const generateLabel = ({
  row,
  col,
}: {
  readonly row: number;
  readonly col: number;
}): string => {
  if (row >= MAX_LABEL_ROWS) {
    throw new Error(`row must be less than ${MAX_LABEL_ROWS}, got ${row}`);
  }
  return `${String.fromCharCode(ASCII_UPPER_A + row)}-${col + 1}`;
};
