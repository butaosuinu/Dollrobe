import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Pencil } from "lucide-react";
import IconButton, { iconButtonClassName } from "@/components/ui/IconButton";

const SIZES = ["xs", "sm", "md", "lg"] as const;
const VARIANTS = ["default", "primary", "danger"] as const;

const SIZE_CLASS = {
  xs: "size-7",
  sm: "size-8",
  md: "size-9",
  lg: "size-10",
} as const;

describe("IconButton", () => {
  describe("size × variant の組み合わせ", () => {
    SIZES.forEach((size) => {
      VARIANTS.forEach((variant) => {
        it(`size=${size} variant=${variant} がレンダリングされる`, () => {
          render(
            <IconButton
              icon={Pencil}
              label="編集"
              size={size}
              variant={variant}
            />,
          );
          const button = screen.getByRole("button", { name: "編集" });
          expect(button).toBeInTheDocument();
          expect(button).toHaveClass(SIZE_CLASS[size]);
        });
      });
    });
  });

  it("クリックで onClick が呼ばれる", async () => {
    const handleClick = vi.fn();
    render(<IconButton icon={Pencil} label="編集" onClick={handleClick} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "編集" }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("disabled が反映される", () => {
    render(<IconButton icon={Pencil} label="編集" disabled />);
    expect(screen.getByRole("button", { name: "編集" })).toBeDisabled();
  });

  it("既定で type=button が付与される（フォーム内でも submit しない）", () => {
    render(<IconButton icon={Pencil} label="編集" />);
    expect(screen.getByRole("button", { name: "編集" })).toHaveAttribute(
      "type",
      "button",
    );
  });

  it("type=submit を明示的に渡せる", () => {
    render(<IconButton icon={Pencil} label="送信" type="submit" />);
    expect(screen.getByRole("button", { name: "送信" })).toHaveAttribute(
      "type",
      "submit",
    );
  });

  it("フォーム内でクリックしても onSubmit が走らない（既定 type=button）", async () => {
    const handleSubmit = vi.fn((e: { preventDefault: () => void }) =>
      e.preventDefault(),
    );
    const handleClick = vi.fn();
    render(
      <form onSubmit={handleSubmit}>
        <IconButton icon={Pencil} label="編集" onClick={handleClick} />
      </form>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "編集" }));
    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(handleSubmit).not.toHaveBeenCalled();
  });
});

describe("iconButtonClassName", () => {
  it("単体で呼び出せて文字列を返す", () => {
    const className = iconButtonClassName({ size: "md", variant: "default" });
    expect(typeof className).toBe("string");
    expect(className).toContain("rounded-lg");
    expect(className).toContain("size-9");
  });

  it("引数なしで既定値が適用される", () => {
    const className = iconButtonClassName();
    expect(className).toContain("size-9");
  });

  it("disabled で opacity-50 が含まれる", () => {
    expect(iconButtonClassName({ disabled: true })).toContain("opacity-50");
  });
});
