import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nTestWrapper } from "@/test/i18nWrapper";
import ConfidenceBadge from "./ConfidenceBadge";

describe("ConfidenceBadge", () => {
  it("confirmedで「確定」テキストとCheckアイコンを表示する", () => {
    const { container } = render(<ConfidenceBadge label="confirmed" />, {
      wrapper: I18nTestWrapper,
    });

    expect(screen.getByText("確定")).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("uncertainで「要確認」テキストとAlertTriangleアイコンを表示する", () => {
    const { container } = render(<ConfidenceBadge label="uncertain" />, {
      wrapper: I18nTestWrapper,
    });

    expect(screen.getByText("要確認")).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("unknownで「不明」テキストとHelpCircleアイコンを表示する", () => {
    const { container } = render(<ConfidenceBadge label="unknown" />, {
      wrapper: I18nTestWrapper,
    });

    expect(screen.getByText("不明")).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
