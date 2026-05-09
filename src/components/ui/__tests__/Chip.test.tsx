import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Chip from "@/components/ui/Chip";

describe("Chip", () => {
  it("selected=true のとき aria-pressed=true が付与される", () => {
    render(
      <Chip selected onClick={() => undefined}>
        SD
      </Chip>,
    );
    const button = screen.getByRole("button", { name: "SD", pressed: true });
    expect(button).toBeInTheDocument();
  });

  it("selected=false のとき aria-pressed=false が付与される", () => {
    render(
      <Chip selected={false} onClick={() => undefined}>
        SD
      </Chip>,
    );
    const button = screen.getByRole("button", { name: "SD", pressed: false });
    expect(button).toBeInTheDocument();
  });

  it("クリックで onClick が呼ばれる", async () => {
    const handleClick = vi.fn();
    render(
      <Chip selected={false} onClick={handleClick}>
        SD
      </Chip>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "SD" }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("disabled で button が無効化される", () => {
    render(
      <Chip selected={false} disabled>
        SD
      </Chip>,
    );
    expect(screen.getByRole("button", { name: "SD" })).toBeDisabled();
  });

  it("onClick 未指定でもレンダリングできる", () => {
    render(<Chip selected={false}>SD</Chip>);
    expect(screen.getByRole("button", { name: "SD" })).toBeInTheDocument();
  });
});
