"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import BottomNav from "@/components/layout/BottomNav";
import ToastContainer from "@/components/ui/Toast";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import Skeleton from "@/components/ui/Skeleton";

// LP / 認証フォームでは TopBar / BottomNav / main 余白を出さず、子要素を
// そのまま描画する。各ページが独自の Header / Footer を持つため。
const BARE_LAYOUT_PATHS: ReadonlySet<string> = new Set([
  "/",
  "/signin",
  "/signup",
]);

type Props = {
  readonly children: React.ReactNode;
};

const AppShell = ({ children }: Props) => {
  const pathname = usePathname();
  if (BARE_LAYOUT_PATHS.has(pathname)) {
    return (
      <>
        {children}
        <ToastContainer />
      </>
    );
  }
  return (
    <div className="flex min-h-dvh flex-col bg-surface-base">
      <ErrorBoundary
        fallback={
          <p className="p-4 text-sm text-danger">認証エラーが発生しました</p>
        }
      >
        <Suspense fallback={<Skeleton className="h-14" />}>
          <TopBar />
        </Suspense>
      </ErrorBoundary>
      <main className="flex-1 pb-24 lg:mx-auto lg:w-full lg:max-w-6xl lg:px-8 lg:pb-6">
        {children}
      </main>
      <BottomNav />
      <ToastContainer />
    </div>
  );
};

export default AppShell;
