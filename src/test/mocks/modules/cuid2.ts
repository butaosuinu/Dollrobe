type Cuid2State = {
  id: string;
  counter: number;
  mode: "fixed" | "uuid" | "sequential";
};

const state: Cuid2State = {
  id: "test-cuid",
  counter: 0,
  mode: "fixed",
};

export const cuid2Factory = () => ({
  createId: () => {
    if (state.mode === "uuid") return crypto.randomUUID();
    if (state.mode === "sequential") {
      state.counter += 1;
      return `${state.id}-${state.counter}`;
    }
    return state.id;
  },
});

type Cuid2Options = {
  readonly id?: string;
  readonly mode?: "fixed" | "uuid" | "sequential";
};

export const setupCuid2 = (options: Cuid2Options = {}) => {
  state.id = options.id ?? "test-cuid";
  state.mode = options.mode ?? "fixed";
  state.counter = 0;
  return {
    setId: (id: string) => {
      state.id = id;
    },
    setMode: (mode: "fixed" | "uuid" | "sequential") => {
      state.mode = mode;
    },
  };
};
