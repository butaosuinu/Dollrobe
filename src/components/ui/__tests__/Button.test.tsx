import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Button, { buttonClassName } from "@/components/ui/Button";

const VARIANTS = [
  "primary",
  "secondary",
  "ghost",
  "danger",
  "outline",
  "danger-solid",
] as const;

const SIZES = ["sm", "md", "lg"] as const;

describe("Button", () => {
  describe("variant × size の組み合わせ", () => {
    VARIANTS.forEach((variant) => {
      SIZES.forEach((size) => {
        it(`variant=${variant} size=${size} がボタンとしてレンダリングされる`, () => {
          render(
            <Button variant={variant} size={size}>
              ラベル
            </Button>,
          );
          expect(
            screen.getByRole("button", { name: "ラベル" }),
          ).toBeInTheDocument();
        });
      });
    });
  });

  it("disabled が反映される", () => {
    render(<Button disabled>ラベル</Button>);
    expect(screen.getByRole("button", { name: "ラベル" })).toBeDisabled();
  });

  it("fullWidth で w-full クラスが付与される", () => {
    render(<Button fullWidth>ラベル</Button>);
    expect(screen.getByRole("button", { name: "ラベル" })).toHaveClass(
      "w-full",
    );
  });

  it("クリックで onClick が呼ばれる", async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>ラベル</Button>);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "ラベル" }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("outline variant が border クラスを含む", () => {
    render(<Button variant="outline">外枠</Button>);
    expect(screen.getByRole("button", { name: "外枠" })).toHaveClass(
      "border-border-default",
    );
  });

  it("danger-solid variant が bg-danger を含む", () => {
    render(<Button variant="danger-solid">削除</Button>);
    expect(screen.getByRole("button", { name: "削除" })).toHaveClass(
      "bg-danger",
    );
  });
});

describe("buttonClassName", () => {
  it("単体で呼び出せて clsx 由来の文字列を返す", () => {
    const className = buttonClassName({ variant: "primary", size: "md" });
    expect(typeof className).toBe("string");
    expect(className).toContain("rounded-lg");
    expect(className).toContain("bg-primary-500");
    expect(className).toContain("h-10");
  });

  it("引数なしで既定値が適用される", () => {
    const className = buttonClassName();
    expect(className).toContain("bg-primary-500");
    expect(className).toContain("h-10");
  });

  it("fullWidth で w-full が含まれる", () => {
    expect(buttonClassName({ fullWidth: true })).toContain("w-full");
  });

  it("disabled で opacity-50 が含まれる", () => {
    expect(buttonClassName({ disabled: true })).toContain("opacity-50");
  });
});
