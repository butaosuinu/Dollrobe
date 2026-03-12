import { render, screen } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { describe, it, expect, vi } from "vitest";
import { authStateAtom } from "@/stores/authAtoms";
import UserMenu from "./UserMenu";

vi.mock("@/lib/auth", () => ({
  signOut: vi.fn().mockResolvedValue(undefined),
  getSession: vi.fn().mockResolvedValue(undefined),
}));

const renderWithStore = (initialUser?: {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly image: string | undefined;
}) => {
  const store = createStore();
  store.set(authStateAtom, {
    user: initialUser,
    isAuthenticated: initialUser !== undefined,
  });

  return render(
    <Provider store={store}>
      <UserMenu />
    </Provider>,
  );
};

describe("UserMenu", () => {
  it("認証済みユーザーのイニシャルが表示される", () => {
    renderWithStore({
      id: "user-1",
      name: "テストユーザー",
      email: "test@example.com",
      image: undefined,
    });

    expect(screen.getByText("テ")).toBeInTheDocument();
    expect(screen.getByLabelText("ログアウト")).toBeInTheDocument();
  });

  it("アバター画像がある場合に表示される", () => {
    renderWithStore({
      id: "user-1",
      name: "テストユーザー",
      email: "test@example.com",
      image: "https://example.com/avatar.png",
    });

    const img = screen.getByAltText("テストユーザー");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/avatar.png");
  });

  it("未認証時は何も表示されない", () => {
    const { container } = renderWithStore(undefined);
    expect(container.innerHTML).toBe("");
  });
});
