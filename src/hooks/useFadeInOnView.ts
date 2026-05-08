"use client";

import { useEffect, useRef, useState } from "react";

export const useFadeInOnView = <T extends HTMLElement = HTMLDivElement>() => {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const { current: node } = ref;
    if (node === null) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: "0px 0px -80px 0px", threshold: 0.1 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, []);

  return {
    ref,
    className: visible
      ? "opacity-100 translate-y-0"
      : "opacity-0 translate-y-4",
    style: {
      transition:
        "opacity 600ms var(--ease-smooth), transform 600ms var(--ease-smooth)",
    },
  };
};
