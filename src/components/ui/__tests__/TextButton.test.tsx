import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TextButton from "@/components/ui/TextButton";

describe("TextButton", () => {
  it("primary variant が text-primary-500 を含む", () => {
    render(
      <TextButton variant="primary" onClick={() => undefined}>
        編集
      </TextButton>,
    );
    expect(screen.getByRole("button", { name: "編集" })).toHaveClass(
      "text-primary-500",
    );
  });

  it("secondary variant が text-text-secondary を含む", () => {
    render(
      <TextButton variant="secondary" onClick={() => undefined}>
        戻る
      </TextButton>,
    );
    expect(screen.getByRole("button", { name: "戻る" })).toHaveClass(
      "text-text-secondary",
    );
  });

  it("muted variant が text-text-tertiary を含む", () => {
    render(
      <TextButton variant="muted" onClick={() => undefined}>
        キャンセル
      </TextButton>,
    );
    expect(screen.getByRole("button", { name: "キャンセル" })).toHaveClass(
      "text-text-tertiary",
    );
  });

  it("variant 未指定で primary が既定", () => {
    render(<TextButton onClick={() => undefined}>既定</TextButton>);
    expect(screen.getByRole("button", { name: "既定" })).toHaveClass(
      "text-primary-500",
    );
  });

  it("クリックで onClick が呼ばれる", async () => {
    const handleClick = vi.fn();
    render(<TextButton onClick={handleClick}>クリック</TextButton>);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "クリック" }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("disabled で無効化される", () => {
    render(
      <TextButton onClick={() => undefined} disabled>
        無効
      </TextButton>,
    );
    expect(screen.getByRole("button", { name: "無効" })).toBeDisabled();
  });
});
