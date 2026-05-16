import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import type { BulkCaptureMetadata } from "@/types";
import { renderWithProviders } from "@/test/testUtils";
import BulkMetadataFormFields from "./BulkMetadataFormFields";

const baseValues: BulkCaptureMetadata = {
  captureId: "c-1",
  name: "テスト",
  category: "dress",
  dollSize: "MSD",
  colors: [],
  tags: [],
  brand: "",
  confidenceDecayDays: 30,
};

describe("BulkMetadataFormFields", () => {
  it("カテゴリ変更で onChange が新カテゴリで呼ばれる (有効値)", async () => {
    const onChange = vi.fn();
    await renderWithProviders(
      <BulkMetadataFormFields values={baseValues} onChange={onChange} />,
    );

    const categorySelect = screen.getByLabelText("カテゴリ");
    fireEvent.change(categorySelect, { target: { value: "tops" } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ category: "tops" }),
    );
  });

  it("カテゴリ変更で無効値は無視される (型ガードで弾かれる)", async () => {
    const onChange = vi.fn();
    await renderWithProviders(
      <BulkMetadataFormFields values={baseValues} onChange={onChange} />,
    );

    const categorySelect = screen.getByLabelText("カテゴリ");
    fireEvent.change(categorySelect, {
      target: { value: "invalid-category" },
    });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("ドールサイズ変更で onChange が呼ばれる (有効値)", async () => {
    const onChange = vi.fn();
    await renderWithProviders(
      <BulkMetadataFormFields values={baseValues} onChange={onChange} />,
    );

    const sizeSelect = screen.getByLabelText("ドールサイズ");
    fireEvent.change(sizeSelect, { target: { value: "SD" } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ dollSize: "SD" }),
    );
  });

  it("ドールサイズ変更で無効値は無視される", async () => {
    const onChange = vi.fn();
    await renderWithProviders(
      <BulkMetadataFormFields values={baseValues} onChange={onChange} />,
    );

    const sizeSelect = screen.getByLabelText("ドールサイズ");
    fireEvent.change(sizeSelect, { target: { value: "invalid-size" } });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("名前変更で onChange が呼ばれる", async () => {
    const onChange = vi.fn();
    await renderWithProviders(
      <BulkMetadataFormFields values={baseValues} onChange={onChange} />,
    );

    const nameInput = screen.getByLabelText("名前");
    fireEvent.change(nameInput, { target: { value: "新しい名前" } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ name: "新しい名前" }),
    );
  });

  it("ブランド変更で onChange が呼ばれる", async () => {
    const onChange = vi.fn();
    await renderWithProviders(
      <BulkMetadataFormFields values={baseValues} onChange={onChange} />,
    );

    const brandInput = screen.getByLabelText("ブランド/メーカー");
    fireEvent.change(brandInput, { target: { value: "アゾン" } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ brand: "アゾン" }),
    );
  });

  it("信頼度の減衰期間が数値変換される", async () => {
    const onChange = vi.fn();
    await renderWithProviders(
      <BulkMetadataFormFields values={baseValues} onChange={onChange} />,
    );

    const decaySelect = screen.getByLabelText("信頼度の減衰期間");
    fireEvent.change(decaySelect, { target: { value: "90" } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ confidenceDecayDays: 90 }),
    );
  });
});
