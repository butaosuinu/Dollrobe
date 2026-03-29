"use client";

import { useMemo } from "react";
import { useAtomValue } from "jotai";
import { garmentsAtom } from "@/stores/garmentAtoms";

export const useBrandSuggestions = (): readonly string[] => {
  const garments = useAtomValue(garmentsAtom);
  return useMemo(() => {
    const brands = new Set(
      garments
        .map((g) => g.brand)
        .filter((b): b is string => b !== undefined && b !== ""),
    );
    return [...brands].sort();
  }, [garments]);
};
