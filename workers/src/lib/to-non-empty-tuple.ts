export const toNonEmptyTuple = <T extends string>(
  arr: readonly T[],
): [T, ...T[]] => {
  const [first, ...rest] = arr;
  if (first === undefined) {
    throw new Error("Array must not be empty");
  }
  return [first, ...rest];
};
