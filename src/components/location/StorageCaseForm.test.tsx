import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/testUtils";
import StorageCaseForm from "./StorageCaseForm";

const defaultProps = {
  onSubmit: vi.fn(),
  onCancel: vi.fn(),
};

describe("StorageCaseForm", () => {
  it("フォームの各フィールドを表示する", () => {
    renderWithProviders(<StorageCaseForm {...defaultProps} />);

    expect(screen.getByLabelText("ケース名")).toBeInTheDocument();
    expect(screen.getByLabelText("行数")).toBeInTheDocument();
    expect(screen.getByLabelText("列数")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "作成" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "キャンセル" }),
    ).toBeInTheDocument();
  });

  it("名前が空の場合は作成ボタンがdisabledになる", () => {
    renderWithProviders(<StorageCaseForm {...defaultProps} />);

    expect(screen.getByRole("button", { name: "作成" })).toBeDisabled();
  });

  it("正しい値で送信するとonSubmitが呼ばれる", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <StorageCaseForm {...defaultProps} onSubmit={onSubmit} />,
    );

    await user.type(screen.getByLabelText("ケース名"), "衣装ケース B");
    await user.click(screen.getByRole("button", { name: "作成" }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "衣装ケース B",
      rows: 2,
      cols: 3,
    });
  });

  it("キャンセルボタンでonCancelが呼ばれる", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <StorageCaseForm {...defaultProps} onCancel={onCancel} />,
    );

    await user.click(screen.getByRole("button", { name: "キャンセル" }));

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("空白のみの名前では送信できない", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <StorageCaseForm {...defaultProps} onSubmit={onSubmit} />,
    );

    await user.type(screen.getByLabelText("ケース名"), "   ");

    expect(screen.getByRole("button", { name: "作成" })).toBeDisabled();
  });
});
