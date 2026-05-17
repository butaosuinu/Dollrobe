import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { Users } from "lucide-react";
import { renderWithProviders } from "@/test/testUtils";
import MetricsCard from "./MetricsCard";

describe("MetricsCard", () => {
  it("label と value (toLocaleString) を表示する", async () => {
    await renderWithProviders(
      <MetricsCard icon={Users} label="総ユーザー数" value={1234567} />,
    );

    expect(screen.getByText("総ユーザー数")).toBeInTheDocument();
    expect(screen.getByText("1,234,567")).toBeInTheDocument();
  });

  it("hint プロパティを指定すると補足文として描画される", async () => {
    await renderWithProviders(
      <MetricsCard
        icon={Users}
        label="アクティブ"
        value={42}
        hint="直近30日で 1 回以上スキャン"
      />,
    );

    expect(screen.getByText("直近30日で 1 回以上スキャン")).toBeInTheDocument();
  });

  it("hint を指定しないと補足文は描画されない", async () => {
    await renderWithProviders(
      <MetricsCard icon={Users} label="シンプル" value={0} />,
    );

    expect(
      screen.queryByText("直近30日で 1 回以上スキャン"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });
});
