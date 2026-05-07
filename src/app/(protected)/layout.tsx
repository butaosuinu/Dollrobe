import type { ReactNode } from "react";
import RequireAuth from "@/components/auth/RequireAuth";

const ProtectedLayout = ({ children }: { readonly children: ReactNode }) => (
  <RequireAuth>{children}</RequireAuth>
);

export default ProtectedLayout;
