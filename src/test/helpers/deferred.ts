type Resolver<T> = (value: T) => void;

// eslint-disable-next-line functional/no-mixed-types -- 意図的に Promise と resolver を 1 つの値で公開する
export type Deferred<T> = {
  readonly promise: Promise<T>;
  readonly resolve: Resolver<T>;
};

export const createDeferred = <T>(): Deferred<T> => {
  const ref: { current: Resolver<T> } = {
    current: () => undefined,
  };
  const promise = new Promise<T>((resolve) => {
    ref.current = resolve;
  });
  return {
    promise,
    resolve: (value: T) => {
      ref.current(value);
    },
  };
};
