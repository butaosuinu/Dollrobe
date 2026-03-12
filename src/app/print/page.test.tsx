/* eslint-disable import/first -- vi.mock must be called before importing the module under test */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockSearchParams = vi.hoisted(() => ({
  value: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams.value,
}));

vi.mock("@/components/qr/QrLabel", () => ({
  default: ({
    name,
  }: {
    readonly type: string;
    readonly id: string;
    readonly name: string;
  }) => <div data-testid="qr-label">{name}</div>,
}));

import PrintPage from "./page";

describe("PrintPage", () => {
  beforeEach(() => {
    mockSearchParams.value = new URLSearchParams();
  });

  it("パラメータなしで「選択されていません」メッセージが表示される", () => {
    render(<PrintPage />);
    expect(
      screen.getByText("印刷する QR コードが選択されていません"),
    ).toBeInTheDocument();
  });

  it("type と ids が指定されたら QR ラベルが表示される", () => {
    mockSearchParams.value = new URLSearchParams(
      "type=garment&ids=g1,g2&names=ドレスA,ドレスB",
    );
    render(<PrintPage />);
    expect(screen.getByText("QR ラベル印刷")).toBeInTheDocument();
    expect(screen.getByText("ドレスA")).toBeInTheDocument();
    expect(screen.getByText("ドレスB")).toBeInTheDocument();
  });

  it("印刷ボタンが存在する", () => {
    mockSearchParams.value = new URLSearchParams(
      "type=garment&ids=g1&names=テスト",
    );
    render(<PrintPage />);
    expect(screen.getByRole("button", { name: /印刷/ })).toBeInTheDocument();
  });

  it("names が指定されていない場合は id がラベルに使われる", () => {
    mockSearchParams.value = new URLSearchParams("type=location&ids=loc-1");
    render(<PrintPage />);
    expect(screen.getByText("loc-1")).toBeInTheDocument();
  });

  it("無効な type の場合は「選択されていません」が表示される", () => {
    mockSearchParams.value = new URLSearchParams("type=invalid&ids=g1");
    render(<PrintPage />);
    expect(
      screen.getByText("印刷する QR コードが選択されていません"),
    ).toBeInTheDocument();
  });
});
