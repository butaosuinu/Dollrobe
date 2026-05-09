import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PageButton from "@/components/ui/PageButton";

describe("PageButton", () => {
  it("page === currentPage のとき aria-current=page が付与される", () => {
    render(<PageButton page={3} currentPage={3} onClick={() => undefined} />);
    expect(screen.getByRole("button", { name: "3" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("page !== currentPage のとき aria-current が付かない", () => {
    render(<PageButton page={2} currentPage={3} onClick={() => undefined} />);
    expect(screen.getByRole("button", { name: "2" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("クリックで page 番号が onClick に渡る", async () => {
    const handleClick = vi.fn();
    render(<PageButton page={5} currentPage={1} onClick={handleClick} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "5" }));
    expect(handleClick).toHaveBeenCalledWith(5);
  });
});
