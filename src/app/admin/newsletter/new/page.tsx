"use client";

import { PageHeader } from "@/components/admin/ui";
import { RequirePermission } from "@/components/admin/AdminShell";
import { IssueForm } from "@/components/admin/IssueForm";
import { canEditModule } from "@/lib/admin";

export default function NewIssuePage() {
  return (
    <RequirePermission allow={(viewer) => canEditModule(viewer, "posts")}>
      <PageHeader
        title="New issue"
        description="Saved as a draft. Nothing is emailed until an administrator presses Send."
        breadcrumb={[{ label: "Newsletter", href: "/admin/newsletter" }, { label: "New" }]}
      />
      <IssueForm />
    </RequirePermission>
  );
}
