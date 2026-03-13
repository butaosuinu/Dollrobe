import { render, screen } from "@testing-library/react";
import { Provider, createStore, atom } from "jotai";
import { describe, it, expect, vi, beforeEach } from "vitest";
import UserMenu from "./UserMenu";

type AuthUser = {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly image: string | undefined;
};

type AuthState = {
  readonly user: AuthUser | undefined;
  readonly isAuthenticated: boolean;
};

const mockAuthState = vi.hoisted(() => {
  const initial: AuthState = { user: undefined, isAuthenticated: false };
  return { value: initial };
});

vi.mock("@/stores/authAtoms", async () => {
  const original = await vi.importActual("@/stores/authAtoms");
  return {
    ...original,
    authSessionAtom: atom(() => mockAuthState.value),
  };
});

vi.mock("@/lib/auth", () => ({
  signOut: vi.fn().mockResolvedValue(undefined),
  getSession: vi.fn().mockResolvedValue(undefined),
}));

describe("UserMenu", () => {
  beforeEach(() => {
    mockAuthState.value = { user: undefined, isAuthenticated: false };
  });

  it("認証済みユーザーのイニシャルが表示される", () => {
    mockAuthState.value = {
      user: {
        id: "user-1",
        name: "テストユーザー",
        email: "test@example.com",
        image: undefined,
      },
      isAuthenticated: true,
    };

    render(
      <Provider store={createStore()}>
        <UserMenu />
      </Provider>,
    );

    expect(screen.getByText("テ")).toBeInTheDocument();
    expect(screen.getByLabelText("ログアウト")).toBeInTheDocument();
  });

  it("アバター画像がある場合に表示される", () => {
    mockAuthState.value = {
      user: {
        id: "user-1",
        name: "テストユーザー",
        email: "test@example.com",
        image: "https://example.com/avatar.png",
      },
      isAuthenticated: true,
    };

    render(
      <Provider store={createStore()}>
        <UserMenu />
      </Provider>,
    );

    const img = screen.getByAltText("テストユーザー");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/avatar.png");
  });

  it("未認証時は何も表示されない", () => {
    const { container } = render(
      <Provider store={createStore()}>
        <UserMenu />
      </Provider>,
    );
    expect(container.innerHTML).toBe("");
  });
});
