import { vi } from "vitest";

type NextNavigationState = {
  router: {
    push: ReturnType<typeof vi.fn>;
    replace: ReturnType<typeof vi.fn>;
    back: ReturnType<typeof vi.fn>;
    forward: ReturnType<typeof vi.fn>;
    refresh: ReturnType<typeof vi.fn>;
    prefetch: ReturnType<typeof vi.fn>;
  };
  params: Record<string, string | readonly string[]>;
  searchParams: URLSearchParams;
  pathname: string;
};

const state: NextNavigationState = {
  router: {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  },
  params: {},
  searchParams: new URLSearchParams(),
  pathname: "/",
};

export const nextNavigationFactory = () => ({
  useRouter: () => state.router,
  useParams: () => state.params,
  useSearchParams: () => state.searchParams,
  usePathname: () => state.pathname,
  redirect: vi.fn(),
  notFound: vi.fn(),
});

type SetupOverrides = {
  readonly params?: Record<string, string | readonly string[]>;
  readonly searchParams?: URLSearchParams;
  readonly pathname?: string;
};

export const setupNextNavigation = (overrides: SetupOverrides = {}) => {
  state.router.push.mockClear();
  state.router.replace.mockClear();
  state.router.back.mockClear();
  state.router.forward.mockClear();
  state.router.refresh.mockClear();
  state.router.prefetch.mockClear();

  state.params = overrides.params ?? {};
  state.searchParams = overrides.searchParams ?? new URLSearchParams();
  state.pathname = overrides.pathname ?? "/";

  return {
    router: state.router,
    setParams: (params: Record<string, string | readonly string[]>) => {
      state.params = params;
    },
    setSearchParams: (sp: URLSearchParams) => {
      state.searchParams = sp;
    },
    setPathname: (pathname: string) => {
      state.pathname = pathname;
    },
  };
};
