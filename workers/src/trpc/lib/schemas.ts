import { z } from "zod";

const MAX_NAME_LENGTH = 100;
const MAX_LABEL_LENGTH = 20;
const MAX_GRID_SIZE = 20;
const MIN_GRID_SIZE = 1;

export const cuidSchema = z.string().min(1);

export const createCaseInputSchema = z.object({
  name: z.string().min(1).max(MAX_NAME_LENGTH),
  rows: z.number().int().min(MIN_GRID_SIZE).max(MAX_GRID_SIZE),
  cols: z.number().int().min(MIN_GRID_SIZE).max(MAX_GRID_SIZE),
});

export const updateCaseInputSchema = z.object({
  id: cuidSchema,
  name: z.string().min(1).max(MAX_NAME_LENGTH),
});

export const createLocationInputSchema = z.object({
  caseId: cuidSchema,
  label: z.string().min(1).max(MAX_LABEL_LENGTH),
  row: z.number().int().min(0),
  col: z.number().int().min(0),
});
