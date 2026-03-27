import { atom } from "jotai";
import { createId } from "@paralleldrive/cuid2";

// eslint-disable-next-line functional/no-mixed-types -- action callback is inherent to the toast model
type ToastAction = {
  readonly label: string;
  readonly onClick: () => void;
};

export type ToastItem = {
  readonly id: string;
  readonly message: string;
  readonly action: ToastAction | undefined;
  readonly durationMs: number;
};

type AddToastParams = {
  readonly message: string;
  readonly action?: ToastAction;
  readonly durationMs?: number;
};

const TOAST_DEFAULT_DURATION_MS = 4000;

/* eslint-disable functional/immutable-data -- timer map requires mutable state for cleanup */
const timerMap = new Map<string, ReturnType<typeof setTimeout>>();

const setTimer = (id: string, timer: ReturnType<typeof setTimeout>) => {
  timerMap.set(id, timer);
};

const clearAndDeleteTimer = (id: string) => {
  const timer = timerMap.get(id);
  timerMap.delete(id);
  return timer;
};
/* eslint-enable functional/immutable-data */

export const toastsAtom = atom<readonly ToastItem[]>([]);

export const addToastAtom = atom(
  undefined,
  (_get, set, params: AddToastParams) => {
    const id = createId();
    const durationMs = params.durationMs ?? TOAST_DEFAULT_DURATION_MS;

    const toast: ToastItem = {
      id,
      message: params.message,
      action: params.action,
      durationMs,
    };

    set(toastsAtom, (prev) => [...prev, toast]);

    const removeThisToast = () => {
      clearAndDeleteTimer(id);
      set(toastsAtom, (prev) => prev.filter((t) => t.id !== id));
    };

    setTimer(id, setTimeout(removeThisToast, durationMs));

    return id;
  },
);

export const dismissToastAtom = atom(undefined, (_get, set, id: string) => {
  const timer = clearAndDeleteTimer(id);
  clearTimeout(timer);
  set(toastsAtom, (prev) => prev.filter((t) => t.id !== id));
});
