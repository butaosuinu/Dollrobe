"use client";

import { useAtomValue } from "jotai";
import { toastsAtom } from "@/stores/toastAtoms";

const ToastContainer = () => {
  const toasts = useAtomValue(toastsAtom);

  if (toasts.length === 0) return undefined;

  return (
    <div className="fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex w-full max-w-sm items-center justify-between gap-3 rounded-xl bg-text-primary px-4 py-3 shadow-lg animate-[slide-up_0.2s_ease-out]"
          role="status"
          aria-live="polite"
        >
          <span className="text-sm text-text-inverse">{toast.message}</span>
          {toast.action !== undefined && (
            <button
              onClick={toast.action.onClick}
              className="shrink-0 text-sm font-medium text-primary-300 transition-colors hover:text-primary-200"
            >
              {toast.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
