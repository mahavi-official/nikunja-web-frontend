"use client";

import { useState } from "react";
import { Eye, EyeOff, MessageSquare, Trash2 } from "lucide-react";
import {
  AdminButton,
  AdminEmpty,
  AdminPagination,
  ErrorNote,
  Field,
  PageHeader,
  Panel,
  Select,
  Spinner,
  useConfirm,
  useToast,
} from "@/components/admin/ui";
import { RequirePermission } from "@/components/admin/AdminShell";
import { useAsync } from "@/components/admin/useAsync";
import { AdminApiError, isStaff, useApi } from "@/lib/admin";
import { cn, formatDate } from "@/lib/format";
import type { Comment, Post } from "@/lib/types";

/**
 * Comment moderation, one post at a time.
 *
 * Comments belong to posts and are read by `postId`, so the screen starts with
 * a post picker rather than a global feed. Hidden comments are listed here —
 * unlike on the public endpoint — so a moderator can undo a decision.
 */
export default function CommentsPage() {
  return (
    <RequirePermission allow={isStaff}>
      <Moderation />
    </RequirePermission>
  );
}

function Moderation() {
  const api = useApi();
  const { notify } = useToast();
  const { confirm, dialog } = useConfirm();

  const [postId, setPostId] = useState("");
  const [page, setPage] = useState(1);

  const posts = useAsync(
    () => api.getPaged<{ posts: Post[] }>("/admin/posts", { limit: 100 }),
    []
  );

  const comments = useAsync(
    () =>
      postId
        ? api.getPaged<{ comments: Comment[] }>("/admin/comments", { postId, page, limit: 20 })
        : Promise.resolve(null),
    [postId, page]
  );

  const setHidden = async (comment: Comment, isHidden: boolean) => {
    try {
      await api.post(`/admin/comments/${comment.id}/hide`, { isHidden });
      notify(isHidden ? "Comment hidden." : "Comment restored.");
      comments.reload();
    } catch (cause) {
      notify(cause instanceof AdminApiError ? cause.message : "Could not update.", "error");
    }
  };

  const remove = async (comment: Comment) => {
    const confirmed = await confirm({
      title: "Delete this comment?",
      body: "Permanent. If it may need reviewing later, hide it instead.",
    });
    if (!confirmed) return;

    try {
      await api.del(`/admin/comments/${comment.id}`);
      notify("Comment deleted.");
      comments.reload();
    } catch (cause) {
      notify(cause instanceof AdminApiError ? cause.message : "Could not delete.", "error");
    }
  };

  const rows = comments.data?.data.comments ?? [];

  return (
    <>
      <PageHeader
        title="Comments"
        description="Only signed-in readers can comment. Hiding keeps a comment in the database; deleting does not."
      />

      <Panel className="mb-5">
        <Field label="Post" hint="Comments are read per post.">
          <Select
            value={postId}
            onChange={(event) => {
              setPostId(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Choose a post…</option>
            {(posts.data?.data.posts ?? [])
              .filter((post) => post.commentsEnabled)
              .map((post) => (
                <option key={post.id} value={post.id}>
                  {post.title}
                </option>
              ))}
          </Select>
        </Field>
      </Panel>

      {!postId ? (
        <AdminEmpty
          title="Pick a post"
          description="Choose one above to review the comments left on it."
        />
      ) : comments.error ? (
        <ErrorNote error={comments.error} onRetry={comments.reload} />
      ) : comments.loading && !comments.data ? (
        <Spinner label="Loading comments" />
      ) : rows.length ? (
        <>
          <ul className="space-y-3">
            {rows.map((comment) => (
              <li
                key={comment.id}
                className={cn(
                  "rounded-2xl border bg-surface-raised p-4",
                  comment.isHidden ? "border-dashed border-line-strong opacity-70" : "border-line"
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-navy-800 text-[0.6875rem] font-semibold text-white">
                    {comment.user.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-sm font-medium text-ink">{comment.user.name}</span>
                  <time dateTime={comment.createdAt} className="text-[0.75rem] text-ink-muted">
                    {formatDate(comment.createdAt)}
                  </time>
                  {comment.isHidden ? (
                    <span className="rounded bg-sand-100 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-sand-600 uppercase dark:bg-navy-900 dark:text-navy-200">
                      hidden
                    </span>
                  ) : null}

                  <span className="ml-auto flex items-center gap-1">
                    <AdminButton
                      tone="secondary"
                      size="sm"
                      onClick={() => setHidden(comment, !comment.isHidden)}
                    >
                      {comment.isHidden ? (
                        <>
                          <Eye className="size-3.5" aria-hidden />
                          Restore
                        </>
                      ) : (
                        <>
                          <EyeOff className="size-3.5" aria-hidden />
                          Hide
                        </>
                      )}
                    </AdminButton>
                    <button
                      type="button"
                      onClick={() => remove(comment)}
                      aria-label="Delete comment"
                      className="grid size-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </span>
                </div>

                <p className="mt-2.5 text-sm leading-relaxed whitespace-pre-wrap text-ink-soft">
                  {comment.body}
                </p>
              </li>
            ))}
          </ul>

          <AdminPagination
            page={comments.data?.meta.page ?? 1}
            totalPages={comments.data?.meta.totalPages ?? 1}
            total={comments.data?.meta.total ?? 0}
            onPage={setPage}
          />
        </>
      ) : (
        <AdminEmpty
          title="No comments on this post"
          description="Nothing to moderate here yet."
        />
      )}

      <p className="mt-6 flex items-center gap-2 text-[0.8125rem] text-ink-muted">
        <MessageSquare className="size-3.5" aria-hidden />
        Posts with comments switched off are not listed.
      </p>

      {dialog}
    </>
  );
}
