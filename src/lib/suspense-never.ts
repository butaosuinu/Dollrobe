/* eslint-disable promise/avoid-new, functional/no-return-void, functional/no-expression-statements, @typescript-eslint/promise-function-async -- SSR Suspense utility requires imperative Promise construction */
export const ssrSuspend = <T>(fallback: T): Promise<T> =>
  new Promise<T>((resolve) => {
    setTimeout(() => {
      resolve(fallback);
    }, 0);
  });
/* eslint-enable promise/avoid-new, functional/no-return-void, functional/no-expression-statements, @typescript-eslint/promise-function-async */
