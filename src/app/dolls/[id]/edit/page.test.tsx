import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { testDb, FIXED_NOW } from "@/test/mocks/db";
import { seedDbFromTestDb } from "@/test/helpers/seedDb";
import { renderWithProviders } from "@/test/testUtils";
import DollEditPage from "./page";

const mockRouter = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
}));

const mockParams = vi.hoisted((): { value: Record<string, string> } => ({
  value: { id: "doll-1" },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  useParams: () => mockParams.value,
}));

const mockUpload = vi.hoisted(() => vi.fn());
const mockResetUpload = vi.hoisted(() => vi.fn());
const mockUploadState = vi.hoisted(() => ({
  value: { status: "idle" } as
    | { status: "idle" }
    | { status: "compressing" }
    | { status: "uploading" }
    | { status: "success"; imageUrl: string }
    | { status: "error"; message: string },
}));

vi.mock("@/hooks/useImageUpload", () => ({
  useImageUpload: () => ({
    uploadState: mockUploadState.value,
    upload: mockUpload,
    reset: mockResetUpload,
  }),
}));

vi.mock("@paralleldrive/cuid2", () => ({
  createId: () => "test-cuid",
}));

describe("DollEditPage", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
    mockRouter.push.mockClear();
    mockRouter.back.mockClear();
    mockUpload.mockClear();
    mockResetUpload.mockClear();
    mockUploadState.value = { status: "idle" };
    mockParams.value = { id: "doll-1" };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("既存ドールのフィールドがフォームに反映される", async () => {
    testDb.doll.create({
      id: "doll-1",
      name: "リナ",
      bodySize: "MSD",
    });
    await seedDbFromTestDb();

    await renderWithProviders(<DollEditPage />);

    expect(screen.getByLabelText("名前")).toHaveValue("リナ");
    expect(screen.getByLabelText("ボディサイズ")).toHaveValue("MSD");
  });

  it("名前を変更して更新する", async () => {
    const user = userEvent.setup();
    testDb.doll.create({ id: "doll-1", name: "リナ" });
    await seedDbFromTestDb();

    await renderWithProviders(<DollEditPage />);

    const nameInput = screen.getByLabelText("名前");
    await user.clear(nameInput);
    await user.type(nameInput, "ミユ");
    await user.click(screen.getByRole("button", { name: "更新する" }));

    const { db } = await import("@/lib/db/dexie");
    await waitFor(async () => {
      const doll = await db.dolls.get("doll-1");
      expect(doll?.name).toBe("ミユ");
    });
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith("/dolls/doll-1");
    });
  });

  it("存在しないドールの場合にメッセージを表示する", async () => {
    mockParams.value = { id: "non-existent" };

    await renderWithProviders(<DollEditPage />);

    expect(
      await screen.findByText("ドールが見つかりません"),
    ).toBeInTheDocument();
    expect(screen.getByText("一覧に戻る")).toBeInTheDocument();
  });
});
