import AppShell from "@/components/layout/AppShell";

const AppLayout = ({ children }: { readonly children: React.ReactNode }) => (
  <AppShell>{children}</AppShell>
);

export default AppLayout;
