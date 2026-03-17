"use client";

import { useEffect } from "react";
import { useSetAtom } from "jotai";
import { executeSyncAtom } from "@/stores/syncAtoms";

export const useOnlineSync = () => {
  const executeSync = useSetAtom(executeSyncAtom);

  useEffect(() => {
    const handleOnline = () => {
      void executeSync();
    };
    window.addEventListener("online", handleOnline);

    if (navigator.onLine) {
      void executeSync();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [executeSync]);
};
