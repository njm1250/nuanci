import { AdminShell } from "@/features/admin/admin-shell";
import { Suspense } from "react";
import { AdminLoading } from "@/features/admin/ui";
import { MarkDevice } from "@/features/admin/mark-device";
import "@/features/admin/admin.css";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense
      fallback={
        <div className="admin-shell">
          <AdminLoading />
        </div>
      }
    >
      <AdminShell>
        {children}
        <MarkDevice />
      </AdminShell>
    </Suspense>
  );
}
