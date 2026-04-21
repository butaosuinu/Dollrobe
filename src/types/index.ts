export type DollSize =
  | "SD"
  | "SD13"
  | "SD17"
  | "MSD"
  | "YoSD"
  | "DD_S"
  | "DD_M"
  | "DD_L"
  | "DDdy"
  | "DDS"
  | "DDP"
  | "MDD_S"
  | "MDD_M"
  | "MDD_L"
  | "other";

export type GarmentCategory =
  | "tops"
  | "bottoms"
  | "onepiece"
  | "dress"
  | "set"
  | "outer"
  | "underwear"
  | "socks"
  | "shoes"
  | "hat"
  | "wig"
  | "accessory"
  | "other";

export type GarmentStatus = "stored" | "checked_out" | "lost";

export type ConfidenceLabel = "confirmed" | "uncertain" | "unknown";

export type Garment = {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly category: GarmentCategory;
  readonly dollSizes: readonly DollSize[];
  readonly colors: readonly string[];
  readonly tags: readonly string[];
  readonly imageUrl: string | undefined;
  readonly locationId: string | undefined;
  readonly status: GarmentStatus;
  readonly lastScannedAt: number;
  readonly confidenceDecayDays: number;
  readonly confidenceDecayDaysOverride: number | undefined;
  readonly recentCheckoutCount: number;
  readonly brand: string | undefined;
  readonly description: string | undefined;
  readonly setContents: string | undefined;
  readonly checkedOutAt: number | undefined;
  readonly archivedAt: number | undefined;
  readonly createdAt: number;
  readonly updatedAt: number;
};

export type StorageCaseType = "grid" | "unit";

export type StorageCase = {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly type: StorageCaseType;
  readonly description: string | undefined;
  readonly rows: number;
  readonly cols: number;
  readonly createdAt: number;
};

export type StorageLocation = {
  readonly id: string;
  readonly userId: string;
  readonly caseId: string;
  readonly label: string;
  readonly customName: string | undefined;
  readonly description: string | undefined;
  readonly row: number;
  readonly col: number;
  readonly lastVisitedAt: number | undefined;
  readonly confirmAllCount: number;
  readonly correctionCount: number;
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

export type ScanConfirmation = {
  readonly garmentId: string;
  readonly confirmed: boolean;
};

export type SyncQueueItem = {
  readonly id?: number;
  readonly type: string;
  readonly payload: unknown;
  readonly createdAt: number;
};

export type Doll = {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly headModel: string | undefined;
  readonly bodySize: DollSize;
  readonly maker: string | undefined;
  readonly customizer: string | undefined;
  readonly imageUrl: string | undefined;
  readonly memo: string | undefined;
  readonly archivedAt: number | undefined;
  readonly createdAt: number;
  readonly updatedAt: number;
};

export type Digest = {
  readonly id: string;
  readonly userId: string;
  readonly accuracyScore: number;
  readonly confirmedCount: number;
  readonly uncertainCount: number;
  readonly unknownCount: number;
  readonly totalGarments: number;
  readonly isRead: boolean;
  readonly generatedAt: number;
  readonly createdAt: number;
};

export type CsvRowValidationError = {
  readonly row: number;
  readonly field: string;
  readonly message: string;
};

export type CsvParsedRow = {
  readonly name: string;
  readonly category: GarmentCategory;
  readonly dollSize: DollSize;
  readonly colors: readonly string[];
  readonly tags: readonly string[];
  readonly brand: string;
  readonly confidenceDecayDays: number;
};

export type CsvValidationResult =
  | { readonly ok: true; readonly data: CsvParsedRow }
  | { readonly ok: false; readonly errors: readonly CsvRowValidationError[] };

export type BulkCaptureItem = {
  readonly captureId: string;
  readonly blob: Blob;
  readonly thumbnailUrl: string;
  readonly capturedAt: number;
};

export type BulkCaptureMetadata = {
  readonly captureId: string;
  readonly name: string;
  readonly category: GarmentCategory;
  readonly dollSize: DollSize;
  readonly colors: readonly string[];
  readonly tags: readonly string[];
  readonly brand: string;
  readonly confidenceDecayDays: number;
};

export type BulkRegistrationStatus =
  | { readonly status: "idle" }
  | {
      readonly status: "registering";
      readonly completed: number;
      readonly total: number;
    }
  | {
      readonly status: "done";
      readonly succeeded: number;
      readonly failed: number;
    }
  | { readonly status: "error"; readonly message: string };
