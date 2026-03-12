import type { StorageCase, StorageLocation } from "@/types/index";
import type { TRPCContext } from "../index";

export const TEMP_USER_ID = "temp-user-001";

const ASCII_UPPER_A = 65;
const MAX_LABEL_ROWS = 26;

export const getUserId = (_ctx: TRPCContext): string => TEMP_USER_ID;

export type StorageCaseRow = {
  readonly id: string;
  readonly user_id: string;
  readonly name: string;
  readonly rows: number;
  readonly cols: number;
  readonly created_at: number;
};

export type StorageLocationRow = {
  readonly id: string;
  readonly user_id: string;
  readonly case_id: string;
  readonly label: string;
  readonly row_num: number;
  readonly col_num: number;
  readonly created_at: number;
};

export const toStorageCase = (row: StorageCaseRow): StorageCase => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  rows: row.rows,
  cols: row.cols,
  createdAt: row.created_at,
});

export const toStorageLocation = (
  row: StorageLocationRow,
): StorageLocation => ({
  id: row.id,
  userId: row.user_id,
  caseId: row.case_id,
  label: row.label,
  row: row.row_num,
  col: row.col_num,
  createdAt: row.created_at,
});

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
