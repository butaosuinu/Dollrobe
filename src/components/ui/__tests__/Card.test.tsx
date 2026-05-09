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

  it("static: className を渡しても base class が保持される", () => {
    render(
      <Card className="custom-class">
        <span>静的</span>
      </Card>,
    );
    const card = screen.getByText("静的").parentElement;
    expect(card).toHaveClass("custom-class");
    expect(card).toHaveClass("border-border-default");
    expect(card).toHaveClass("bg-surface-overlay");
    expect(card).toHaveClass("shadow-card");
    expect(card).toHaveClass("p-4");
    expect(card).toHaveClass("rounded-xl");
  });

  it("clickable: className を渡しても base class が保持される", () => {
    render(
      <Card clickable padding="sm" className="custom-class">
        選択カード
      </Card>,
    );
    const button = screen.getByRole("button", { name: "選択カード" });
    expect(button).toHaveClass("custom-class");
    expect(button).toHaveClass("border-border-default");
    expect(button).toHaveClass("text-left");
    expect(button).toHaveClass("w-full");
    expect(button).toHaveClass("focus-visible:outline-primary-500");
    expect(button).toHaveClass("p-3");
  });

  it("static: 非 DOM props (padding/radius/hoverable) が DOM 属性にリークしない", () => {
    render(
      <Card padding="lg" radius="lg" hoverable>
        <span>非リーク</span>
      </Card>,
    );
    const card = screen.getByText("非リーク").parentElement;
    expect(card).not.toHaveAttribute("padding");
    expect(card).not.toHaveAttribute("radius");
    expect(card).not.toHaveAttribute("hoverable");
    expect(card).not.toHaveAttribute("clickable");
  });

  it("clickable: 非 DOM props が DOM 属性にリークしない", () => {
    render(
      <Card clickable padding="lg" radius="lg" hoverable>
        ボタン
      </Card>,
    );
    const button = screen.getByRole("button", { name: "ボタン" });
    expect(button).not.toHaveAttribute("padding");
    expect(button).not.toHaveAttribute("radius");
    expect(button).not.toHaveAttribute("hoverable");
    expect(button).not.toHaveAttribute("clickable");
  });

  it("clickable: 標準 aria-* 属性は ...rest 経由でそのまま伝わる", () => {
    render(
      <Card clickable aria-pressed aria-label="aria伝播テスト">
        子
      </Card>,
    );
    const button = screen.getByRole("button", {
      name: "aria伝播テスト",
      pressed: true,
    });
    expect(button).toBeInTheDocument();
  });
});
