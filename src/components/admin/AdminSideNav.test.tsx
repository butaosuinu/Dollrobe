import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/testUtils";
import { setupNextNavigation } from "@/test/mocks/modules/nextNavigation";
import AdminSideNav from "./AdminSideNav";

const getLink = (href: string) => {
  const link = screen
    .getAllByRole("link")
    .find((el) => el.getAttribute("href") === href);
  expect(link, `Nav link not found for href: ${href}`).toBeDefined();
  return link!;
};

describe("AdminSideNav", () => {
  beforeEach(() => {
    setupNextNavigation({ pathname: "/admin" });
  });

  it("メトリクス・ユーザー・監査ログの 3 リンクを表示する", async () => {
    await renderWithProviders(<AdminSideNav />);

    expect(getLink("/admin")).toBeInTheDocument();
    expect(getLink("/admin/users")).toBeInTheDocument();
    expect(getLink("/admin/audits")).toBeInTheDocument();
    expect(screen.getByText("メトリクス")).toBeInTheDocument();
    expect(screen.getByText("ユーザー")).toBeInTheDocument();
    expect(screen.getByText("監査ログ")).toBeInTheDocument();
  });

  it("pathname が /admin のときメトリクスのみが active になる (完全一致)", async () => {
    setupNextNavigation({ pathname: "/admin" });
    await renderWithProviders(<AdminSideNav />);

    expect(getLink("/admin").getAttribute("aria-current")).toBe("page");
    expect(getLink("/admin/users").getAttribute("aria-current")).toBeNull();
    expect(getLink("/admin/audits").getAttribute("aria-current")).toBeNull();
  });

  it("pathname が /admin/users のときユーザーが active になり、メトリクスは active にならない", async () => {
    setupNextNavigation({ pathname: "/admin/users" });
    await renderWithProviders(<AdminSideNav />);

    expect(getLink("/admin/users").getAttribute("aria-current")).toBe("page");
    expect(getLink("/admin").getAttribute("aria-current")).toBeNull();
  });

  it("pathname が /admin/users/<id> のときユーザーが active のままになる (前方一致)", async () => {
    setupNextNavigation({ pathname: "/admin/users/u-1" });
    await renderWithProviders(<AdminSideNav />);

    expect(getLink("/admin/users").getAttribute("aria-current")).toBe("page");
    expect(getLink("/admin").getAttribute("aria-current")).toBeNull();
  });

  it("pathname が /admin/audits のとき監査ログが active になる", async () => {
    setupNextNavigation({ pathname: "/admin/audits" });
    await renderWithProviders(<AdminSideNav />);

    expect(getLink("/admin/audits").getAttribute("aria-current")).toBe("page");
    expect(getLink("/admin").getAttribute("aria-current")).toBeNull();
    expect(getLink("/admin/users").getAttribute("aria-current")).toBeNull();
  });

  it("pathname が /dashboard のときどのリンクも active にならない", async () => {
    setupNextNavigation({ pathname: "/dashboard" });
    await renderWithProviders(<AdminSideNav />);

    expect(getLink("/admin").getAttribute("aria-current")).toBeNull();
    expect(getLink("/admin/users").getAttribute("aria-current")).toBeNull();
    expect(getLink("/admin/audits").getAttribute("aria-current")).toBeNull();
  });
});
