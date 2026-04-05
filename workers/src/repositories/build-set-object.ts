export const buildSetObject = <T extends Record<string, unknown>>({
  fields,
  keys,
}: {
  readonly fields: T;
  readonly keys: ReadonlyArray<keyof T & string>;
}): Record<string, T[keyof T & string]> => {
  const entries = keys.flatMap((key) => {
    const value = fields[key];
    return value === undefined ? [] : ([[key, value]] as const);
  });
  return Object.fromEntries(entries);
};
