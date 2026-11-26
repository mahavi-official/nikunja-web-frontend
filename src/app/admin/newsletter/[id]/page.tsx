"use client";

import { use, useEffect, useState } from "react";
import { ErrorNote, PageHeader, Spinner } from "@/components/admin/ui";
import { RequirePermission } from "@/components/admin/AdminShell";
import { IssueForm } from "@/components/admin/IssueForm";
import { useAsync } from "@/components/admin/useAsync";
import { canEditModule, useApi } from "@/lib/admin";
import { formatDate } from "@/lib/format";
import type { NewsletterIssue } from "@/lib/types";

export default function EditIssuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <RequirePermission allow={(viewer) => canEditModule(viewer, "posts")}>
      <Editor id={id} />
    </RequirePermission>
  );
}

function Editor({ id }: { id: string }) {
  const api = useApi();
  const { data, error, loading, reload } = useAsync(
    () => api.get<NewsletterIssue>(`/admin/newsletter/issues/${id}`),
    [id]
  );

  // The form and the send panel push fresh copies of the record up here.
  const [issue, setIssue] = useState<NewsletterIssue | null>(null);
  useEffect(() => {
    if (data) setIssue(data);
  }, [data]);

  if (loading && !issue) return <Spinner label="Loading issue" />;
  if (error && !issue) return <ErrorNote error={error} onRetry={reload} />;
  if (!issue) return null;

  return (
    <>
      <PageHeader
        title={issue.title || "Untitled issue"}
        description={`Last updated ${formatDate(issue.updatedAt)}`}
        breadcrumb={[{ label: "Newsletter", href: "/admin/newsletter" }, { label: "Edit" }]}
      />
      {/* Keyed on the record so switching issues resets the form. */}
      <IssueForm key={issue.id} issue={issue} onChanged={setIssue} />
    </>
  );
}
