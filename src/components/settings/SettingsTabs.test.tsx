import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/testUtils";
import { setupNextNavigation } from "@/test/mocks/modules/nextNavigation";
import SettingsTabs from "./SettingsTabs";

describe("SettingsTabs", () => {
  beforeEach(() => {
    setupNextNavigation();
  });

  it("/settings/account にいるときアカウントタブが選択状態になる", async () => {
    setupNextNavigation({ pathname: "/settings/account" });

    await renderWithProviders(<SettingsTabs />);

    expect(screen.getByRole("link", { name: "アカウント" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "API キー" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("/settings/api-keys にいるとき API キータブが選択状態になる", async () => {
    setupNextNavigation({ pathname: "/settings/api-keys" });

    await renderWithProviders(<SettingsTabs />);

    expect(screen.getByRole("link", { name: "API キー" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("link", { name: "アカウント" }),
    ).not.toHaveAttribute("aria-current");
  });
});
