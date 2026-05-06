const originalDescriptors = new WeakMap<
  object,
  Map<string, PropertyDescriptor | undefined>
>();
const touchedTargets = new Set<object>();

export const installObjectProperty = (
  target: object,
  key: string,
  value: unknown,
): void => {
  const existing = originalDescriptors.get(target);
  const perTarget =
    existing ?? new Map<string, PropertyDescriptor | undefined>();
  if (existing === undefined) {
    originalDescriptors.set(target, perTarget);
    touchedTargets.add(target);
  }
  if (!perTarget.has(key)) {
    perTarget.set(key, Object.getOwnPropertyDescriptor(target, key));
  }
  Object.defineProperty(target, key, {
    value,
    writable: true,
    configurable: true,
  });
};

export const restoreInstalledProperties = (): void => {
  touchedTargets.forEach((target) => {
    const perTarget = originalDescriptors.get(target);
    if (perTarget === undefined) return;
    perTarget.forEach((original, key) => {
      if (original === undefined) {
        Reflect.deleteProperty(target, key);
        return;
      }
      Object.defineProperty(target, key, original);
    });
    originalDescriptors.delete(target);
  });
  touchedTargets.clear();
};
