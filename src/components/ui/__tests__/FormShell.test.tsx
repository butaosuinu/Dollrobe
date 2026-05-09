import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FormShell from "@/components/ui/FormShell";

describe("FormShell", () => {
  it("既定で gap-4 クラスを持つ form をレンダリングする", () => {
    render(
      <FormShell onSubmit={() => undefined}>
        <button type="submit">送信</button>
      </FormShell>,
    );
    const form = screen.getByRole("button", { name: "送信" }).closest("form");
    expect(form).toHaveClass("gap-4");
    expect(form).toHaveClass("flex");
    expect(form).toHaveClass("flex-col");
  });

  it("gap=sm で gap-3 が付く", () => {
    render(
      <FormShell gap="sm" onSubmit={() => undefined}>
        <button type="submit">送信</button>
      </FormShell>,
    );
    const form = screen.getByRole("button", { name: "送信" }).closest("form");
    expect(form).toHaveClass("gap-3");
  });

  it("gap=lg で gap-6 が付く", () => {
    render(
      <FormShell gap="lg" onSubmit={() => undefined}>
        <button type="submit">送信</button>
      </FormShell>,
    );
    const form = screen.getByRole("button", { name: "送信" }).closest("form");
    expect(form).toHaveClass("gap-6");
  });

  it("submit で onSubmit が呼ばれる", async () => {
    const handleSubmit = vi.fn((event: React.SyntheticEvent) => {
      event.preventDefault();
    });
    render(
      <FormShell onSubmit={handleSubmit}>
        <button type="submit">送信</button>
      </FormShell>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "送信" }));
    expect(handleSubmit).toHaveBeenCalledTimes(1);
  });

  it("className が結合される", () => {
    render(
      <FormShell className="max-w-md" onSubmit={() => undefined}>
        <button type="submit">送信</button>
      </FormShell>,
    );
    const form = screen.getByRole("button", { name: "送信" }).closest("form");
    expect(form).toHaveClass("max-w-md");
  });
});
