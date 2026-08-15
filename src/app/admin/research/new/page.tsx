"use client";

import { PageHeader } from "@/components/admin/ui";
import { RequirePermission } from "@/components/admin/AdminShell";
import { ResearchForm, emptyResearchDraft } from "@/components/admin/ResearchForm";
import { canEditModule } from "@/lib/admin";

export default function NewResearchPage() {
  return (
    <RequirePermission allow={(viewer) => canEditModule(viewer, "research")}>
      <PageHeader
        title="New publication"
        description="Save the record first, then attach its PDFs."
        breadcrumb={[{ label: "Research", href: "/admin/research" }, { label: "New" }]}
      />
      <ResearchForm initial={emptyResearchDraft()} />
    </RequirePermission>
  );
}
