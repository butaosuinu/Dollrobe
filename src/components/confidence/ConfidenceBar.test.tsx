import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ConfidenceBar from "./ConfidenceBar";

describe("ConfidenceBar", () => {
  it("progressbarロールが存在する", () => {
    render(<ConfidenceBar confidence={0.75} />);

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("aria-valuenowが正しいパーセント値を持つ", () => {
    render(<ConfidenceBar confidence={0.75} />);

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveAttribute("aria-valuenow", "75");
  });

  it("widthスタイルが正しいパーセント値を持つ", () => {
    render(<ConfidenceBar confidence={0.5} />);

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveStyle({ width: "50%" });
  });

  it("パーセント値が表示される", () => {
    render(<ConfidenceBar confidence={0.83} />);

    expect(screen.getByText("83%")).toBeInTheDocument();
  });
});
