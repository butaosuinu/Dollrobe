import { vi, type Mock } from "vitest";

type Router = {
  readonly push: ReturnType<typeof vi.fn>;
  readonly replace: ReturnType<typeof vi.fn>;
  readonly back: ReturnType<typeof vi.fn>;
  readonly forward: ReturnType<typeof vi.fn>;
  readonly refresh: ReturnType<typeof vi.fn>;
  readonly prefetch: ReturnType<typeof vi.fn>;
};

type NextNavigationState = {
  readonly router: Router;
  readonly params: Record<string, string | readonly string[]>;
  readonly searchParams: URLSearchParams;
  readonly pathname: string;
};

const createRouter = (): Router => ({
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
});

const initialRouter = createRouter();
const initialState: NextNavigationState = {
  router: initialRouter,
  params: {},
  searchParams: new URLSearchParams(),
  pathname: "/",
};

const stateMap = new Map<"v", NextNavigationState>([["v", initialState]]);
const getState = (): NextNavigationState => stateMap.get("v") ?? initialState;
const setState = (next: NextNavigationState): void => {
  stateMap.set("v", next);
};

export type NextNavigationMock = {
  readonly useRouter: () => Router;
  readonly useParams: () => Record<string, string | readonly string[]>;
  readonly useSearchParams: () => URLSearchParams;
  readonly usePathname: () => string;
  readonly redirect: Mock;
  readonly notFound: Mock;
};

export const nextNavigationFactory = (): NextNavigationMock => ({
  useRouter: () => getState().router,
  useParams: () => getState().params,
  useSearchParams: () => getState().searchParams,
  usePathname: () => getState().pathname,
  redirect: vi.fn(),
  notFound: vi.fn(),
});

type SetupOverrides = {
  readonly params?: Record<string, string | readonly string[]>;
  readonly searchParams?: URLSearchParams;
  readonly pathname?: string;
};

export const setupNextNavigation = (overrides: SetupOverrides = {}) => {
  const current = getState();
  current.router.push.mockClear();
  current.router.replace.mockClear();
  current.router.back.mockClear();
  current.router.forward.mockClear();
  current.router.refresh.mockClear();
  current.router.prefetch.mockClear();

  setState({
    router: current.router,
    params: overrides.params ?? {},
    searchParams: overrides.searchParams ?? new URLSearchParams(),
    pathname: overrides.pathname ?? "/",
  });

  return {
    router: current.router,
    setParams: (params: Record<string, string | readonly string[]>) => {
      setState({ ...getState(), params });
    },
    setSearchParams: (sp: URLSearchParams) => {
      setState({ ...getState(), searchParams: sp });
    },
    setPathname: (pathname: string) => {
      setState({ ...getState(), pathname });
    },
  };
};
