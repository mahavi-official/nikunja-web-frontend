"use client";

import { use } from "react";
import { ErrorNote, PageHeader, Spinner } from "@/components/admin/ui";
import { RequirePermission } from "@/components/admin/AdminShell";
import { ResearchForm, draftFromResearch } from "@/components/admin/ResearchForm";
import { useAsync } from "@/components/admin/useAsync";
import { canEditModule, useApi, type ResearchFileRow } from "@/lib/admin";
import { formatDate } from "@/lib/format";
import type { Research } from "@/lib/types";

export default function EditResearchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <RequirePermission allow={(viewer) => canEditModule(viewer, "research")}>
      <Editor id={id} />
    </RequirePermission>
  );
}

function Editor({ id }: { id: string }) {
  const api = useApi();
  const { data, error, loading, reload } = useAsync(
    () => api.get<Research & { files?: ResearchFileRow[] }>(`/admin/research/${id}`),
    [id]
  );

  if (loading && !data) return <Spinner label="Loading publication" />;
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <>
      <PageHeader
        title={data.title || "Untitled publication"}
        description={`Last updated ${formatDate(data.updatedAt)} · ${data.viewCount} views`}
        breadcrumb={[{ label: "Research", href: "/admin/research" }, { label: "Edit" }]}
      />
      <ResearchForm
        key={data.id}
        researchId={data.id}
        initial={draftFromResearch(data)}
        status={data.status}
        files={(data.files as ResearchFileRow[]) ?? []}
        // Attaching or detaching a PDF changes data this component owns, so the
        // refetch happens here rather than through a full route refresh.
        onFilesChanged={reload}
      />
    </>
  );
}
