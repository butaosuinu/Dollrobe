import { describe, it, expect, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/testUtils";
import StorageCaseForm from "./StorageCaseForm";

const defaultProps = {
  defaultGridName: "引き出し収納 1",
  defaultUnitName: "ボックス 1",
  onSubmit: vi.fn(),
  onCancel: vi.fn(),
};

describe("StorageCaseForm", () => {
  it("フォームの各フィールドを表示する", async () => {
    await renderWithProviders(<StorageCaseForm {...defaultProps} />);

    expect(screen.getByLabelText("ケース名")).toBeInTheDocument();
    expect(screen.getByLabelText("行数")).toBeInTheDocument();
    expect(screen.getByLabelText("列数")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "作成" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "キャンセル" }),
    ).toBeInTheDocument();
  });

  it("デフォルト名が入力されている場合は作成ボタンが有効になる", async () => {
    await renderWithProviders(<StorageCaseForm {...defaultProps} />);

    expect(screen.getByRole("button", { name: "作成" })).not.toBeDisabled();
  });

  it("正しい値で送信するとonSubmitが呼ばれる", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    await renderWithProviders(
      <StorageCaseForm {...defaultProps} onSubmit={onSubmit} />,
    );

    await user.clear(screen.getByLabelText("ケース名"));
    await user.type(screen.getByLabelText("ケース名"), "衣装ケース B");
    await user.click(screen.getByRole("button", { name: "作成" }));

    expect(onSubmit).toHaveBeenCalledWith({
      type: "grid",
      name: "衣装ケース B",
      description: undefined,
      rows: 2,
      cols: 3,
    });
  });

  it("キャンセルボタンでonCancelが呼ばれる", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    await renderWithProviders(
      <StorageCaseForm {...defaultProps} onCancel={onCancel} />,
    );

    await user.click(screen.getByRole("button", { name: "キャンセル" }));

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("空白のみの名前では送信できない", async () => {
    const user = userEvent.setup();
    await renderWithProviders(
      <StorageCaseForm {...defaultProps} onSubmit={vi.fn()} />,
    );

    await user.clear(screen.getByLabelText("ケース名"));
    await user.type(screen.getByLabelText("ケース名"), "   ");

    expect(screen.getByRole("button", { name: "作成" })).toBeDisabled();
  });

  it("行数に0を入力した場合、最小値1にクランプされて送信される", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    await renderWithProviders(
      <StorageCaseForm {...defaultProps} onSubmit={onSubmit} />,
    );

    fireEvent.change(screen.getByLabelText("行数"), {
      target: { value: "0" },
    });
    await user.click(screen.getByRole("button", { name: "作成" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ type: "grid", rows: 1, cols: 3 }),
    );
  });

  it("列数に0を入力した場合、最小値1にクランプされて送信される", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    await renderWithProviders(
      <StorageCaseForm {...defaultProps} onSubmit={onSubmit} />,
    );

    fireEvent.change(screen.getByLabelText("列数"), {
      target: { value: "0" },
    });
    await user.click(screen.getByRole("button", { name: "作成" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ type: "grid", rows: 2, cols: 1 }),
    );
  });

  it("ボックスタイプを選択すると行数・列数が非表示になる", async () => {
    const user = userEvent.setup();
    await renderWithProviders(
      <StorageCaseForm {...defaultProps} onSubmit={vi.fn()} />,
    );

    await user.click(screen.getByRole("button", { name: "ボックス" }));

    expect(screen.queryByLabelText("行数")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("列数")).not.toBeInTheDocument();
  });

  it("ボックスタイプで送信するとtype=unitで送信される", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    await renderWithProviders(
      <StorageCaseForm {...defaultProps} onSubmit={onSubmit} />,
    );

    await user.click(screen.getByRole("button", { name: "ボックス" }));
    await user.click(screen.getByRole("button", { name: "作成" }));

    expect(onSubmit).toHaveBeenCalledWith({
      type: "unit",
      name: "ボックス 1",
      description: undefined,
    });
  });
});
