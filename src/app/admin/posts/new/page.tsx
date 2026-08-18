"use client";

import { PageHeader } from "@/components/admin/ui";
import { RequirePermission } from "@/components/admin/AdminShell";
import { PostForm, emptyDraft } from "@/components/admin/PostForm";
import { canEditModule } from "@/lib/admin";

export default function NewPostPage() {
  return (
    <RequirePermission allow={(viewer) => canEditModule(viewer, "posts")}>
      <PageHeader
        title="New post"
        description="Saved as a draft until you publish it."
        breadcrumb={[{ label: "Articles & blogs", href: "/admin/posts" }, { label: "New" }]}
      />
      <PostForm initial={emptyDraft()} />
    </RequirePermission>
  );
}
