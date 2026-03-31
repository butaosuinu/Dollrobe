import { atom } from "jotai";
import { createId } from "@paralleldrive/cuid2";
import type {
  BulkCaptureItem,
  BulkCaptureMetadata,
  BulkRegistrationStatus,
  DollSize,
  GarmentCategory,
} from "@/types";
import {
  GARMENT_STATUS,
  DEFAULT_CONFIDENCE_DECAY_DAYS,
  SYNC_ACTION_TYPE,
} from "@/lib/constants";
import { compressImage } from "@/lib/image/compressImage";
import { db } from "@/lib/db/dexie";
import { refreshGarmentsAtom } from "@/stores/garmentAtoms";
import { authSessionAtom } from "@/stores/authAtoms";
import { WORKERS_URL_FOR_FETCH } from "@/lib/workersUrl";

type BulkCaptureStep = "capture" | "metadata" | "registering" | "done";

export const capturedItemsAtom = atom<readonly BulkCaptureItem[]>([]);

export const bulkCaptureStepAtom = atom<BulkCaptureStep>("capture");

export const metadataMapAtom = atom<ReadonlyMap<string, BulkCaptureMetadata>>(
  new Map(),
);

export const bulkRegistrationStatusAtom = atom<BulkRegistrationStatus>({
  status: "idle",
});

export const currentMetadataIndexAtom = atom(0);

export const addCapturedItemAtom = atom(
  undefined,
  (_get, set, item: BulkCaptureItem) => {
    set(capturedItemsAtom, (prev) => [...prev, item]);
  },
);

export const removeCapturedItemAtom = atom(
  undefined,
  (_get, set, captureId: string) => {
    set(capturedItemsAtom, (prev) => {
      prev
        .filter((i) => i.captureId === captureId)
        .forEach((item) => {
          URL.revokeObjectURL(item.thumbnailUrl);
        });
      return prev.filter((i) => i.captureId !== captureId);
    });
  },
);

export const setMetadataAtom = atom(
  undefined,
  (_get, set, metadata: BulkCaptureMetadata) => {
    set(
      metadataMapAtom,
      (prev) => new Map([...prev, [metadata.captureId, metadata]]),
    );
  },
);

export const resetBulkCaptureSessionAtom = atom(undefined, (get, set) => {
  const items = get(capturedItemsAtom);
  items.forEach((item) => {
    URL.revokeObjectURL(item.thumbnailUrl);
  });
  set(capturedItemsAtom, []);
  set(metadataMapAtom, new Map());
  set(bulkCaptureStepAtom, "capture");
  set(bulkRegistrationStatusAtom, { status: "idle" });
  set(currentMetadataIndexAtom, 0);
});

const defaultMetadata = (captureId: string): BulkCaptureMetadata => ({
  captureId,
  name: "",
  category: "tops" satisfies GarmentCategory,
  dollSize: "SD" satisfies DollSize,
  colors: [],
  tags: [],
  brand: "",
  confidenceDecayDays: DEFAULT_CONFIDENCE_DECAY_DAYS,
});

export const getMetadataForItem = (
  map: ReadonlyMap<string, BulkCaptureMetadata>,
  captureId: string,
): BulkCaptureMetadata => map.get(captureId) ?? defaultMetadata(captureId);

const uploadImage = async ({
  file,
  garmentId,
}: {
  readonly file: File;
  readonly garmentId: string;
}): Promise<string | undefined> => {
  const compressed = await compressImage({ file });
  const formData = new FormData();
  formData.append("file", compressed.file);
  const response = await fetch(
    `${WORKERS_URL_FOR_FETCH}/api/images/upload/${garmentId}`,
    { method: "POST", body: formData, credentials: "include" },
  ).catch(() => undefined);
  const data: { readonly imageUrl: string } | undefined =
    response?.ok === true
      ? await response.json().catch(() => undefined)
      : undefined;
  return data?.imageUrl;
};

const registerSingleItem = async ({
  item,
  metadata,
  userId,
}: {
  readonly item: BulkCaptureItem;
  readonly metadata: BulkCaptureMetadata;
  readonly userId: string;
}): Promise<boolean> => {
  const garmentId = createId();
  const now = Date.now();
  const file = new File([item.blob], `${garmentId}.png`, {
    type: "image/png",
  });
  const imageUrl = await uploadImage({ file, garmentId }).catch(
    () => undefined,
  );

  const garment = {
    id: garmentId,
    userId,
    name: metadata.name,
    category: metadata.category,
    dollSizes: [metadata.dollSize],
    colors: [...metadata.colors],
    tags: [...metadata.tags],
    brand: metadata.brand === "" ? undefined : metadata.brand,
    description: undefined,
    setContents: undefined,
    confidenceDecayDays: metadata.confidenceDecayDays,
    imageUrl,
    locationId: undefined,
    status: GARMENT_STATUS.CHECKED_OUT,
    lastScannedAt: now,
    checkedOutAt: now,
    archivedAt: undefined,
    createdAt: now,
    updatedAt: now,
  } as const;

  await db.garments.add(garment);
  await db.syncQueue.add({
    type: SYNC_ACTION_TYPE.GARMENT_CREATE,
    payload: garment,
    createdAt: now,
  });

  return true;
};

export const executeBulkRegistrationAtom = atom(undefined, async (get, set) => {
  const items = get(capturedItemsAtom);
  const metadataMap = get(metadataMapAtom);
  const authState = await get(authSessionAtom);
  const userId = authState.user?.id ?? "local";

  set(bulkCaptureStepAtom, "registering");
  set(bulkRegistrationStatusAtom, {
    status: "registering",
    completed: 0,
    total: items.length,
  });

  const promises = items.map(async (item) => {
    const metadata = getMetadataForItem(metadataMap, item.captureId);
    const result = await registerSingleItem({ item, metadata, userId }).catch(
      () => false,
    );
    set(bulkRegistrationStatusAtom, (prev) =>
      prev.status === "registering"
        ? { ...prev, completed: prev.completed + 1 }
        : prev,
    );
    return result;
  });

  const results = await Promise.allSettled(promises);

  const { length: succeeded } = results.filter(
    (r) => r.status === "fulfilled" && r.value,
  );
  const failed = results.length - succeeded;

  set(bulkRegistrationStatusAtom, { status: "done", succeeded, failed });
  set(bulkCaptureStepAtom, "done");
  set(refreshGarmentsAtom);
});
