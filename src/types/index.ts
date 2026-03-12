export type DollSize = "1/3" | "MSD" | "SD" | "YoSD" | "1/6" | "other";

export type GarmentCategory =
  | "tops"
  | "bottoms"
  | "dress"
  | "outer"
  | "shoes"
  | "accessory"
  | "other";

export type GarmentStatus = "stored" | "checked_out" | "lost";

export type ConfidenceLabel = "confirmed" | "uncertain" | "unknown";

export type Garment = {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly category: GarmentCategory;
  readonly dollSize: DollSize;
  readonly colors: readonly string[];
  readonly tags: readonly string[];
  readonly imageUrl: string | undefined;
  readonly locationId: string | undefined;
  readonly status: GarmentStatus;
  readonly lastScannedAt: number;
  readonly confidenceDecayDays: number;
  readonly checkedOutAt: number | undefined;
  readonly createdAt: number;
  readonly updatedAt: number;
};

export type StorageCase = {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly rows: number;
  readonly cols: number;
  readonly createdAt: number;
};

export type StorageLocation = {
  readonly id: string;
  readonly userId: string;
  readonly caseId: string;
  readonly label: string;
  readonly row: number;
  readonly col: number;
  readonly createdAt: number;
};

export type Coordinate = {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly garmentIds: readonly string[];
  readonly isAiGenerated: boolean;
  readonly memo: string | undefined;
  readonly createdAt: number;
  readonly updatedAt: number;
};

export type SyncQueueItem = {
  readonly id?: number;
  readonly type: string;
  readonly payload: unknown;
  readonly createdAt: number;
};
