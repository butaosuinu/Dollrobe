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
    <main className="flex-1 pb-24">{children}</main>
    <BottomNav />
  </div>
);

export default AppShell;
