import TopBar from "@/components/layout/TopBar";
import BottomNav from "@/components/layout/BottomNav";

type Props = {
  readonly children: React.ReactNode;
};

const AppShell = ({ children }: Props) => (
  <div className="flex min-h-dvh flex-col bg-surface-base">
    <TopBar />
    <main className="flex-1 pb-24">{children}</main>
    <BottomNav />
  </div>
);

export default AppShell;
