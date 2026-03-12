import TopBar from "@/components/layout/TopBar";
import BottomNav from "@/components/layout/BottomNav";
import AuthGuard from "@/components/auth/AuthGuard";

type Props = {
  readonly children: React.ReactNode;
};

const AppShell = ({ children }: Props) => (
  <AuthGuard>
    <div className="flex min-h-dvh flex-col bg-surface-base">
      <TopBar />
      <main className="flex-1 pb-24">{children}</main>
      <BottomNav />
    </div>
  </AuthGuard>
);

export default AppShell;
