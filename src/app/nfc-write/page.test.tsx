import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { testDb } from "@/test/mocks/db";
import { seedDbFromTestDb } from "@/test/helpers/seedDb";
import * as nfcCapability from "@/lib/nfc/capability";
import { renderWithProviders } from "@/test/testUtils";
import NfcWritePage from "./page";

const mockWriteNfcTag = vi.hoisted(() => vi.fn());

vi.mock("@/lib/nfc/writer", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/nfc/writer")>(
      "@/lib/nfc/writer",
    );
  return {
    ...actual,
    writeNfcTag: mockWriteNfcTag,
  };
});

describe("NfcWritePage", () => {
  beforeEach(() => {
    mockWriteNfcTag.mockReset();
    vi.spyOn(nfcCapability, "isNfcSupported").mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("NFC非対応デバイスで非対応メッセージを表示する", async () => {
    vi.spyOn(nfcCapability, "isNfcSupported").mockReturnValue(false);
    await renderWithProviders(<NfcWritePage />);

    expect(
      await screen.findByText(
        "このデバイスは NFC 書き込みに対応していません。Android Chrome をご利用ください。",
      ),
    ).toBeInTheDocument();
  });

  it("NFC対応デバイスでタイプ選択画面を表示する", async () => {
    vi.spyOn(nfcCapability, "isNfcSupported").mockReturnValue(true);
    await renderWithProviders(<NfcWritePage />);

    expect(
      screen.getByText("書き込む対象を選択してください"),
    ).toBeInTheDocument();
    expect(screen.getByText("服")).toBeInTheDocument();
    expect(screen.getByText("収納場所")).toBeInTheDocument();
  });

  it("「服」を選択するとアイテム選択画面に進む", async () => {
    vi.spyOn(nfcCapability, "isNfcSupported").mockReturnValue(true);
    testDb.garment.create({ id: "g-1", name: "白いドレス" });
    await seedDbFromTestDb();
    const user = userEvent.setup();
    await renderWithProviders(<NfcWritePage />);

    await user.click(screen.getByText("服"));

    expect(screen.getByText("書き込む服を選択")).toBeInTheDocument();
  });

  it("「収納場所」を選択するとアイテム選択画面に進む", async () => {
    vi.spyOn(nfcCapability, "isNfcSupported").mockReturnValue(true);
    testDb.storageCase.create({ id: "case-1", name: "ケースA" });
    testDb.storageLocation.create({
      id: "loc-1",
      caseId: "case-1",
      label: "A-1",
    });
    await seedDbFromTestDb();
    const user = userEvent.setup();
    await renderWithProviders(<NfcWritePage />);

    await user.click(screen.getByText("収納場所"));

    expect(screen.getByText("書き込む収納場所を選択")).toBeInTheDocument();
  });

  it("アイテムを選択して「次へ」で書き込み準備画面に進む", async () => {
    vi.spyOn(nfcCapability, "isNfcSupported").mockReturnValue(true);
    testDb.garment.create({ id: "g-1", name: "白いドレス" });
    await seedDbFromTestDb();
    const user = userEvent.setup();
    await renderWithProviders(<NfcWritePage />);

    await user.click(screen.getByText("服"));
    await user.selectOptions(screen.getByRole("combobox"), "g-1");
    await user.click(screen.getByRole("button", { name: "次へ" }));

    expect(screen.getByText("書き込み対象")).toBeInTheDocument();
    expect(screen.getByText("白いドレス")).toBeInTheDocument();
    expect(screen.getByText("dwg://g/g-1")).toBeInTheDocument();
  });

  it("「戻る」で前の画面に戻る", async () => {
    vi.spyOn(nfcCapability, "isNfcSupported").mockReturnValue(true);
    testDb.garment.create({ id: "g-1", name: "白いドレス" });
    await seedDbFromTestDb();
    const user = userEvent.setup();
    await renderWithProviders(<NfcWritePage />);

    await user.click(screen.getByText("服"));
    expect(screen.getByText("書き込む服を選択")).toBeInTheDocument();

    await user.click(screen.getByText("戻る"));
    expect(
      screen.getByText("書き込む対象を選択してください"),
    ).toBeInTheDocument();
  });

  it("書き込み成功時にフィードバックを表示する", async () => {
    vi.spyOn(nfcCapability, "isNfcSupported").mockReturnValue(true);
    mockWriteNfcTag.mockResolvedValueOnce({ ok: true });
    testDb.garment.create({ id: "g-1", name: "白いドレス" });
    await seedDbFromTestDb();
    const user = userEvent.setup();
    await renderWithProviders(<NfcWritePage />);

    await user.click(screen.getByText("服"));
    await user.selectOptions(screen.getByRole("combobox"), "g-1");
    await user.click(screen.getByRole("button", { name: "次へ" }));
    await user.click(screen.getByRole("button", { name: "書き込む" }));

    await waitFor(() =>
      expect(
        screen.getByText("NFC タグへの書き込みが完了しました"),
      ).toBeInTheDocument(),
    );
  });

  it("権限拒否時にエラーメッセージを表示する", async () => {
    vi.spyOn(nfcCapability, "isNfcSupported").mockReturnValue(true);
    mockWriteNfcTag.mockResolvedValueOnce({
      ok: false,
      errorKind: "permission_denied",
      message: "Permission denied",
    });
    testDb.garment.create({ id: "g-1", name: "白いドレス" });
    await seedDbFromTestDb();
    const user = userEvent.setup();
    await renderWithProviders(<NfcWritePage />);

    await user.click(screen.getByText("服"));
    await user.selectOptions(screen.getByRole("combobox"), "g-1");
    await user.click(screen.getByRole("button", { name: "次へ" }));
    await user.click(screen.getByRole("button", { name: "書き込む" }));

    await waitFor(() =>
      expect(
        screen.getByText("NFC の権限が拒否されました"),
      ).toBeInTheDocument(),
    );
  });

  it("書き込み失敗時にエラーメッセージを表示する", async () => {
    vi.spyOn(nfcCapability, "isNfcSupported").mockReturnValue(true);
    mockWriteNfcTag.mockResolvedValueOnce({
      ok: false,
      errorKind: "write_failed",
      message: "Tag not writable",
    });
    testDb.garment.create({ id: "g-1", name: "白いドレス" });
    await seedDbFromTestDb();
    const user = userEvent.setup();
    await renderWithProviders(<NfcWritePage />);

    await user.click(screen.getByText("服"));
    await user.selectOptions(screen.getByRole("combobox"), "g-1");
    await user.click(screen.getByRole("button", { name: "次へ" }));
    await user.click(screen.getByRole("button", { name: "書き込む" }));

    await waitFor(() =>
      expect(screen.getByText("書き込みに失敗しました")).toBeInTheDocument(),
    );
  });

  it("「もう1枚書き込む」でタイプ選択に戻る", async () => {
    vi.spyOn(nfcCapability, "isNfcSupported").mockReturnValue(true);
    mockWriteNfcTag.mockResolvedValueOnce({ ok: true });
    testDb.garment.create({ id: "g-1", name: "白いドレス" });
    await seedDbFromTestDb();
    const user = userEvent.setup();
    await renderWithProviders(<NfcWritePage />);

    await user.click(screen.getByText("服"));
    await user.selectOptions(screen.getByRole("combobox"), "g-1");
    await user.click(screen.getByRole("button", { name: "次へ" }));
    await user.click(screen.getByRole("button", { name: "書き込む" }));

    await waitFor(() =>
      expect(
        screen.getByText("NFC タグへの書き込みが完了しました"),
      ).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: "もう1枚書き込む" }));

    expect(
      screen.getByText("書き込む対象を選択してください"),
    ).toBeInTheDocument();
  });
});
