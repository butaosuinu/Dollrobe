"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { useLingui } from "@lingui/react";
import { NAV_ITEMS } from "@/lib/nav-items";

const BottomNav = () => {
  const pathname = usePathname();
  const { i18n } = useLingui();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border-default bg-surface-overlay/90 backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex h-16 items-center justify-around">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          const isScan = href === "/scan";

          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex flex-col items-center gap-0.5 transition-colors",
                isScan ? "relative -mt-3" : "px-3 py-1",
                isActive ? "text-primary-500" : "text-text-tertiary",
              )}
            >
              {isScan ? (
                <span
                  className={clsx(
                    "flex size-12 items-center justify-center rounded-full shadow-md transition-all",
                    isActive
                      ? "bg-primary-500 text-text-inverse"
                      : "bg-primary-100 text-primary-600",
                  )}
                >
                  <Icon className="size-5" />
                </span>
              ) : (
                <Icon
                  className={clsx(
                    "size-5 transition-transform",
                    isActive && "scale-110",
                  )}
                />
              )}
              <span
                className={clsx("text-[10px] font-medium", isScan && "mt-0.5")}
              >
                {i18n._(label)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
