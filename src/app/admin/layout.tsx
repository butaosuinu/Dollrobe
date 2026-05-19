"use client";

import { Trans } from "@lingui/react/macro";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminSideNav from "@/components/admin/AdminSideNav";
import PageHeader from "@/components/ui/PageHeader";

const AdminLayout = ({ children }: { readonly children: React.ReactNode }) => (
  <AdminGuard>
    <div className="flex flex-col gap-4 p-4">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Trans>管理画面</Trans>
          </span>
        }
      />
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        <aside className="lg:flex-shrink-0">
          <AdminSideNav />
        </aside>
        <section className="flex-1 min-w-0">{children}</section>
      </div>
    </div>
  </AdminGuard>
);

export default AdminLayout;
