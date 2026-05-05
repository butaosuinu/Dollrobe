type Cuid2State = {
  readonly id: string;
  readonly counter: number;
  readonly mode: "fixed" | "uuid" | "sequential";
};

const initialState: Cuid2State = {
  id: "test-cuid",
  counter: 0,
  mode: "fixed",
};

const stateMap = new Map<"v", Cuid2State>([["v", initialState]]);
const getState = (): Cuid2State => stateMap.get("v") ?? initialState;
const setState = (next: Cuid2State): void => {
  stateMap.set("v", next);
};

export const cuid2Factory = () => ({
  createId: () => {
    const s = getState();
    if (s.mode === "uuid") return crypto.randomUUID();
    if (s.mode === "sequential") {
      const next = s.counter + 1;
      setState({ ...s, counter: next });
      return `${s.id}-${next}`;
    }
    return s.id;
  },
});

type Cuid2Options = {
  readonly id?: string;
  readonly mode?: "fixed" | "uuid" | "sequential";
};

export const setupCuid2 = (options: Cuid2Options = {}) => {
  setState({
    id: options.id ?? "test-cuid",
    counter: 0,
    mode: options.mode ?? "fixed",
  });
  return {
    setId: (id: string) => {
      setState({ ...getState(), id });
    },
    setMode: (mode: "fixed" | "uuid" | "sequential") => {
      setState({ ...getState(), mode });
    },
  };
};
