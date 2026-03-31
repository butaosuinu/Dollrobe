import { useState, useEffect } from "react";

const LG_BREAKPOINT = 1024;
const XL_BREAKPOINT = 1280;

const getColumns = (width: number): number => {
  if (width >= XL_BREAKPOINT) return 4;
  if (width >= LG_BREAKPOINT) return 3;
  return 2;
};

export const useGridColumns = (): number => {
  const [columns, setColumns] = useState(() =>
    typeof window === "undefined" ? 2 : getColumns(window.innerWidth),
  );

  useEffect(() => {
    const handleResize = () => {
      setColumns(getColumns(window.innerWidth));
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return columns;
};
