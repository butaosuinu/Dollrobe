import { Suspense } from "react";
import TopBar from "@/components/layout/TopBar";
import BottomNav from "@/components/layout/BottomNav";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import Skeleton from "@/components/ui/Skeleton";

type Props = {
  readonly children: React.ReactNode;
};

const AppShell = ({ children }: Props) => (
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
  </div>
);

export default AppShell;
