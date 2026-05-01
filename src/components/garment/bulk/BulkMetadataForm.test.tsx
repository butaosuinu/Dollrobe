import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { atom } from "jotai";
import type {
  BulkCaptureItem,
  BulkCaptureMetadata,
  BulkRegistrationStatus,
} from "@/types";
import { renderWithProviders } from "@/test/testUtils";
import BulkMetadataForm from "./BulkMetadataForm";

type BulkStep = "capture" | "metadata" | "registering" | "done";

type MockState = {
  items: BulkCaptureItem[];
  metadataMap: Map<string, BulkCaptureMetadata>;
  currentIndex: number;
  step: BulkStep;
  registrationStatus: BulkRegistrationStatus;
  setMetadataCalls: BulkCaptureMetadata[];
  setCurrentIndexCalls: number[];
  setStepCalls: string[];
  executeRegistrationCalls: number;
};

const mockState = vi.hoisted<MockState>(() => ({
  items: [],
  metadataMap: new Map(),
  currentIndex: 0,
  step: "metadata",
  registrationStatus: { status: "idle" },
  setMetadataCalls: [],
  setCurrentIndexCalls: [],
  setStepCalls: [],
  executeRegistrationCalls: 0,
}));

vi.mock("@/stores/bulkCaptureAtoms", () => {
  const capturedItemsAtom = atom(
    (_get) => mockState.items,
    (_get, _set, next: readonly BulkCaptureItem[]) => {
      mockState.items.splice(0, mockState.items.length, ...next);
    },
  );
  const metadataMapAtom = atom(
    (_get) => mockState.metadataMap,
    (_get, _set, next: ReadonlyMap<string, BulkCaptureMetadata>) => {
      mockState.metadataMap.clear();
      next.forEach((value, key) => mockState.metadataMap.set(key, value));
    },
  );
  const currentMetadataIndexAtom = atom(
    (_get) => mockState.currentIndex,
    (_get, _set, next: number) => {
      mockState.currentIndex = next;
      mockState.setCurrentIndexCalls.push(next);
    },
  );
  const bulkCaptureStepAtom = atom(
    (_get) => mockState.step,
    (_get, _set, next: BulkStep) => {
      mockState.step = next;
      mockState.setStepCalls.push(next);
    },
  );
  const setMetadataAtom = atom(
    undefined,
    (_get, _set, metadata: BulkCaptureMetadata) => {
      mockState.metadataMap.set(metadata.captureId, metadata);
      mockState.setMetadataCalls.push(metadata);
    },
  );
  const executeBulkRegistrationAtom = atom(undefined, () => {
    mockState.executeRegistrationCalls += 1;
  });

  const defaultMetadata = (captureId: string): BulkCaptureMetadata => ({
    captureId,
    name: "",
    category: "tops",
    dollSize: "SD",
    colors: [],
    tags: [],
    brand: "",
    confidenceDecayDays: 30,
  });

  return {
    capturedItemsAtom,
    metadataMapAtom,
    currentMetadataIndexAtom,
    bulkCaptureStepAtom,
    setMetadataAtom,
    executeBulkRegistrationAtom,
    bulkRegistrationStatusAtom: atom(() => mockState.registrationStatus),
    addCapturedItemAtom: atom(undefined, () => undefined),
    removeCapturedItemAtom: atom(undefined, () => undefined),
    resetBulkCaptureSessionAtom: atom(undefined, () => undefined),
    getMetadataForItem: (
      map: ReadonlyMap<string, BulkCaptureMetadata>,
      captureId: string,
    ): BulkCaptureMetadata => map.get(captureId) ?? defaultMetadata(captureId),
  };
});

const createTestItem = (
  overrides: Partial<BulkCaptureItem> = {},
): BulkCaptureItem => ({
  captureId: "capture-1",
  blob: new Blob(["test"], { type: "image/png" }),
  thumbnailUrl: "blob:thumb-1",
  capturedAt: 1_700_000_000_000,
  ...overrides,
});

const createTestMetadata = (
  overrides: Partial<BulkCaptureMetadata> = {},
): BulkCaptureMetadata => ({
  captureId: "capture-1",
  name: "ドール服",
  category: "dress",
  dollSize: "MSD",
  colors: ["hsl(0,0%,100%)"],
  tags: ["レース"],
  brand: "ボークス",
  confidenceDecayDays: 30,
  ...overrides,
});

const resetMockState = () => {
  mockState.items.splice(0, mockState.items.length);
  mockState.metadataMap.clear();
  mockState.currentIndex = 0;
  mockState.step = "metadata";
  mockState.registrationStatus = { status: "idle" };
  mockState.setMetadataCalls.splice(0, mockState.setMetadataCalls.length);
  mockState.setCurrentIndexCalls.splice(
    0,
    mockState.setCurrentIndexCalls.length,
  );
  mockState.setStepCalls.splice(0, mockState.setStepCalls.length);
  mockState.executeRegistrationCalls = 0;
};

describe("BulkMetadataForm", () => {
  beforeEach(() => {
    resetMockState();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("currentItem が undefined の場合は空コンテナのみ描画する", async () => {
    const { container } = await renderWithProviders(<BulkMetadataForm />);

    expect(container.querySelector("img")).toBeNull();
    expect(screen.queryByLabelText("名前")).toBeNull();
  });

  it("最初のアイテム表示時は「戻る」ボタンと「次へ」ボタンを表示する", async () => {
    mockState.items.push(
      createTestItem({ captureId: "c1" }),
      createTestItem({ captureId: "c2", thumbnailUrl: "blob:thumb-2" }),
    );
    mockState.metadataMap.set("c1", createTestMetadata({ captureId: "c1" }));

    await renderWithProviders(<BulkMetadataForm />);

    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /戻る/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /次へ/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /前の値を適用/ })).toBeNull();
  });

  it("最後のアイテム表示時は「前へ」ボタンと「登録開始」ボタンを表示する", async () => {
    mockState.items.push(
      createTestItem({ captureId: "c1" }),
      createTestItem({ captureId: "c2", thumbnailUrl: "blob:thumb-2" }),
    );
    mockState.metadataMap.set("c1", createTestMetadata({ captureId: "c1" }));
    mockState.metadataMap.set(
      "c2",
      createTestMetadata({ captureId: "c2", name: "二つ目" }),
    );
    mockState.currentIndex = 1;

    await renderWithProviders(<BulkMetadataForm />);

    expect(screen.getByText("2 / 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /前へ/ })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "登録開始" }),
    ).toBeInTheDocument();
  });

  it("「次へ」ボタンで currentIndex がインクリメントされる", async () => {
    mockState.items.push(
      createTestItem({ captureId: "c1" }),
      createTestItem({ captureId: "c2", thumbnailUrl: "blob:thumb-2" }),
    );
    mockState.metadataMap.set("c1", createTestMetadata({ captureId: "c1" }));

    await renderWithProviders(<BulkMetadataForm />);

    fireEvent.click(screen.getByRole("button", { name: /次へ/ }));

    expect(mockState.setCurrentIndexCalls).toContain(1);
  });

  it("「前へ」ボタンで currentIndex がデクリメントされる", async () => {
    mockState.items.push(
      createTestItem({ captureId: "c1" }),
      createTestItem({ captureId: "c2", thumbnailUrl: "blob:thumb-2" }),
    );
    mockState.metadataMap.set("c1", createTestMetadata({ captureId: "c1" }));
    mockState.metadataMap.set("c2", createTestMetadata({ captureId: "c2" }));
    mockState.currentIndex = 1;

    await renderWithProviders(<BulkMetadataForm />);

    fireEvent.click(screen.getByRole("button", { name: /前へ/ }));

    expect(mockState.setCurrentIndexCalls).toContain(0);
  });

  it("最初のアイテムで「戻る」を押すと step が capture に戻る", async () => {
    mockState.items.push(createTestItem({ captureId: "c1" }));
    mockState.metadataMap.set("c1", createTestMetadata({ captureId: "c1" }));

    await renderWithProviders(<BulkMetadataForm />);

    fireEvent.click(screen.getByRole("button", { name: /戻る/ }));

    expect(mockState.setStepCalls).toContain("capture");
  });

  it("全てのアイテムに名前が入っていれば「登録開始」が有効になる", async () => {
    mockState.items.push(
      createTestItem({ captureId: "c1" }),
      createTestItem({ captureId: "c2", thumbnailUrl: "blob:thumb-2" }),
    );
    mockState.metadataMap.set(
      "c1",
      createTestMetadata({ captureId: "c1", name: "一つ目" }),
    );
    mockState.metadataMap.set(
      "c2",
      createTestMetadata({ captureId: "c2", name: "二つ目" }),
    );
    mockState.currentIndex = 1;

    await renderWithProviders(<BulkMetadataForm />);

    expect(screen.getByRole("button", { name: "登録開始" })).toBeEnabled();
  });

  it("名前が空のアイテムがあると「登録開始」が無効になる", async () => {
    mockState.items.push(
      createTestItem({ captureId: "c1" }),
      createTestItem({ captureId: "c2", thumbnailUrl: "blob:thumb-2" }),
    );
    mockState.metadataMap.set(
      "c1",
      createTestMetadata({ captureId: "c1", name: "一つ目" }),
    );
    mockState.currentIndex = 1;

    await renderWithProviders(<BulkMetadataForm />);

    expect(screen.getByRole("button", { name: "登録開始" })).toBeDisabled();
  });

  it("名前が空白のみだと「登録開始」が無効になる", async () => {
    mockState.items.push(createTestItem({ captureId: "c1" }));
    mockState.metadataMap.set(
      "c1",
      createTestMetadata({ captureId: "c1", name: "   " }),
    );

    await renderWithProviders(<BulkMetadataForm />);

    expect(screen.getByRole("button", { name: "登録開始" })).toBeDisabled();
  });

  it("「登録開始」クリックで executeRegistration が呼ばれる", async () => {
    mockState.items.push(createTestItem({ captureId: "c1" }));
    mockState.metadataMap.set(
      "c1",
      createTestMetadata({ captureId: "c1", name: "完了テスト" }),
    );

    await renderWithProviders(<BulkMetadataForm />);

    fireEvent.click(screen.getByRole("button", { name: "登録開始" }));

    expect(mockState.executeRegistrationCalls).toBe(1);
  });

  it("「前の値を適用」で前のメタデータが name 空でコピーされる", async () => {
    mockState.items.push(
      createTestItem({ captureId: "c1" }),
      createTestItem({ captureId: "c2", thumbnailUrl: "blob:thumb-2" }),
    );
    mockState.metadataMap.set(
      "c1",
      createTestMetadata({
        captureId: "c1",
        name: "前のアイテム",
        brand: "ブランドX",
        dollSize: "SD13",
        category: "outer",
        colors: ["hsl(120,50%,50%)"],
        tags: ["タグA"],
        confidenceDecayDays: 90,
      }),
    );
    mockState.currentIndex = 1;

    await renderWithProviders(<BulkMetadataForm />);

    fireEvent.click(screen.getByRole("button", { name: /前の値を適用/ }));

    expect(mockState.setMetadataCalls.length).toBe(1);
    const applied = mockState.setMetadataCalls[0];
    expect(applied?.captureId).toBe("c2");
    expect(applied?.name).toBe("");
    expect(applied?.brand).toBe("ブランドX");
    expect(applied?.dollSize).toBe("SD13");
    expect(applied?.category).toBe("outer");
    expect(applied?.colors).toEqual(["hsl(120,50%,50%)"]);
    expect(applied?.tags).toEqual(["タグA"]);
    expect(applied?.confidenceDecayDays).toBe(90);
  });

  it("メタデータフォームの値変更で setMetadata が呼ばれる", async () => {
    const user = userEvent.setup();
    mockState.items.push(createTestItem({ captureId: "c1" }));
    mockState.metadataMap.set("c1", createTestMetadata({ captureId: "c1" }));

    await renderWithProviders(<BulkMetadataForm />);

    const nameInput = screen.getByLabelText("名前");
    await user.type(nameInput, "X");

    expect(mockState.setMetadataCalls.length).toBeGreaterThan(0);
    expect(mockState.setMetadataCalls.at(-1)?.captureId).toBe("c1");
  });

  it("currentMetadata が未取得（map に未登録）でもデフォルト値で描画される", async () => {
    mockState.items.push(createTestItem({ captureId: "c1" }));

    await renderWithProviders(<BulkMetadataForm />);

    expect(screen.getByLabelText("名前")).toHaveValue("");
    expect(screen.getByText("1 / 1")).toBeInTheDocument();
  });
});
