const ASCII_UPPER_A = 65;

export const generateLabel = ({
  row,
  col,
}: {
  readonly row: number;
  readonly col: number;
}): string => `${String.fromCharCode(ASCII_UPPER_A + row)}-${col + 1}`;
