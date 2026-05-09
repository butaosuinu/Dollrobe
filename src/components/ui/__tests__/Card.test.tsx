import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Card from "@/components/ui/Card";

describe("Card", () => {
  it("既定で div としてレンダリングされ、p-4 と rounded-xl を持つ", () => {
    render(
      <Card>
        <span>子要素</span>
      </Card>,
    );
    const card = screen.getByText("子要素").parentElement;
    expect(card?.tagName).toBe("DIV");
    expect(card).toHaveClass("p-4");
    expect(card).toHaveClass("rounded-xl");
  });

  it("padding=sm で p-3 が付く", () => {
    render(
      <Card padding="sm">
        <span>小</span>
      </Card>,
    );
    expect(screen.getByText("小").parentElement).toHaveClass("p-3");
  });

  it("padding=lg で p-5 が付く", () => {
    render(
      <Card padding="lg">
        <span>大</span>
      </Card>,
    );
    expect(screen.getByText("大").parentElement).toHaveClass("p-5");
  });

  it("radius=lg で rounded-2xl が付く", () => {
    render(
      <Card radius="lg">
        <span>2xl</span>
      </Card>,
    );
    expect(screen.getByText("2xl").parentElement).toHaveClass("rounded-2xl");
  });

  it("hoverable で hover transition class が付く", () => {
    render(
      <Card hoverable>
        <span>ホバー</span>
      </Card>,
    );
    expect(screen.getByText("ホバー").parentElement).toHaveClass(
      "transition-all",
    );
  });

  it("clickable=true のとき button としてレンダリングされる", () => {
    render(<Card clickable>選択可能</Card>);
    const button = screen.getByRole("button", { name: "選択可能" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("text-left");
    expect(button).toHaveClass("w-full");
    expect(button).toHaveClass("focus-visible:outline-primary-500");
  });

  it("clickable=true のとき onClick が呼ばれる", async () => {
    const handleClick = vi.fn();
    render(
      <Card clickable onClick={handleClick}>
        選択
      </Card>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "選択" }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("clickable=true で disabled が反映される", () => {
    render(
      <Card clickable disabled>
        選択
      </Card>,
    );
    expect(screen.getByRole("button", { name: "選択" })).toBeDisabled();
  });

  it("className が結合される", () => {
    render(
      <Card className="custom-class">
        <span>カスタム</span>
      </Card>,
    );
    expect(screen.getByText("カスタム").parentElement).toHaveClass(
      "custom-class",
    );
  });
});
