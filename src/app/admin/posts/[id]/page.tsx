"use client";

import { use } from "react";
import { ErrorNote, PageHeader, Spinner } from "@/components/admin/ui";
import { RequirePermission } from "@/components/admin/AdminShell";
import { PostForm, draftFromPost } from "@/components/admin/PostForm";
import { useAsync } from "@/components/admin/useAsync";
import { canEditModule, useApi } from "@/lib/admin";
import { formatDate } from "@/lib/format";
import type { Post } from "@/lib/types";

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
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
    () => api.get<Post>(`/admin/posts/${id}`),
    [id]
  );

  if (loading && !data) return <Spinner label="Loading post" />;
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <>
      <PageHeader
        title={data.title || "Untitled post"}
        description={`Last updated ${formatDate(data.updatedAt)} · ${data.viewCount} views`}
        breadcrumb={[{ label: "Articles & blogs", href: "/admin/posts" }, { label: "Edit" }]}
      />
      {/* Keyed on the record so switching posts resets the form state rather
          than carrying the previous post's unsaved edits across. */}
      <PostForm key={data.id} postId={data.id} initial={draftFromPost(data)} status={data.status} />
    </>
  );
}
