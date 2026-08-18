"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Plus, Search, Star, Trash2 } from "lucide-react";
import {
  AdminButton,
  AdminLinkButton,
  AdminPagination,
  EmptyRow,
  ErrorNote,
  Input,
  PageHeader,
  Select,
  Spinner,
  StatusPill,
  TableShell,
  Td,
  Th,
  useConfirm,
  useToast,
} from "@/components/admin/ui";
import { RequirePermission } from "@/components/admin/AdminShell";
import { useAsync, useDebounced } from "@/components/admin/useAsync";
import { AdminApiError, canEditModule, useApi } from "@/lib/admin";
import { formatDate } from "@/lib/format";
import type { Post } from "@/lib/types";

/** Articles and blogs are one model split by `placement`, so one screen serves both. */
export default function PostsPage() {
  return (
    <RequirePermission allow={(viewer) => canEditModule(viewer, "posts")}>
      <PostsList />
    </RequirePermission>
  );
}

function PostsList() {
  const api = useApi();
  const { notify } = useToast();
  const { confirm, dialog } = useConfirm();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [placement, setPlacement] = useState("");
  const [status, setStatus] = useState("");
  const query = useDebounced(search);

  const { data, error, loading, reload } = useAsync(
    () =>
      api.getPaged<{ posts: Post[] }>("/admin/posts", {
        page,
        limit: 20,
        q: query || undefined,
        placement: placement || undefined,
        status: status || undefined,
      }),
    [page, query, placement, status]
  );

  const posts = data?.data.posts ?? [];

  /** Publish state is toggled in place — no round trip through the editor. */
  const togglePublish = async (post: Post) => {
    const next = post.status === "PUBLISHED" ? "unpublish" : "publish";
    try {
      await api.post(`/admin/posts/${post.id}/${next}`);
      notify(next === "publish" ? "Post published." : "Post moved back to draft.");
      reload();
    } catch (cause) {
      notify(cause instanceof AdminApiError ? cause.message : "Could not update.", "error");
    }
  };

  const remove = async (post: Post) => {
    const confirmed = await confirm({
      title: "Delete this post?",
      body: `“${post.title}” and its comments will be removed. This cannot be undone.`,
    });
    if (!confirmed) return;

    try {
      await api.del(`/admin/posts/${post.id}`);
      notify("Post deleted.");
      reload();
    } catch (cause) {
      notify(cause instanceof AdminApiError ? cause.message : "Could not delete.", "error");
    }
  };

  const publicPath = (post: Post) =>
    post.placement === "BLOG" ? `/blogs/${post.slug}` : `/articles/${post.slug}`;

  return (
    <>
      <PageHeader
        title="Articles & blogs"
        description="Long-form writing. Placement decides whether a piece lives under /articles or /blogs."
        actions={
          <AdminLinkButton href="/admin/posts/new">
            <Plus className="size-4" aria-hidden />
            New post
          </AdminLinkButton>
        }
      />

      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search titles and bodies…"
            aria-label="Search posts"
            className="pl-9"
          />
        </div>

        <Select
          value={placement}
          aria-label="Filter by placement"
          onChange={(event) => {
            setPlacement(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All placements</option>
          <option value="ARTICLE">Articles</option>
          <option value="BLOG">Blogs</option>
        </Select>

        <Select
          value={status}
          aria-label="Filter by status"
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Any status</option>
          <option value="PUBLISHED">Published</option>
          <option value="DRAFT">Draft</option>
        </Select>
      </div>

      {error ? <ErrorNote error={error} onRetry={reload} /> : null}

      {loading && !data ? (
        <Spinner label="Loading posts" />
      ) : (
        <>
          <TableShell>
            <thead>
              <tr>
                <Th>Title</Th>
                <Th className="w-28">Placement</Th>
                <Th className="w-28">Status</Th>
                <Th className="w-36">Published</Th>
                <Th className="w-40 text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {posts.length === 0 ? (
                <EmptyRow colSpan={5}>
                  {query || placement || status
                    ? "No posts match these filters."
                    : "No posts yet. Create the first one."}
                </EmptyRow>
              ) : (
                posts.map((post) => (
                  <tr key={post.id} className="transition-colors hover:bg-surface-sunken/60">
                    <Td>
                      <Link
                        href={`/admin/posts/${post.id}`}
                        className="font-medium text-ink transition-colors hover:text-flame-600"
                      >
                        {post.title}
                      </Link>
                      <div className="mt-0.5 flex items-center gap-2 text-[0.75rem] text-ink-muted">
                        <span className="truncate">/{post.slug}</span>
                        {post.isFeatured ? (
                          <span className="inline-flex items-center gap-1 text-flame-600">
                            <Star className="size-3 fill-current" aria-hidden />
                            Featured
                          </span>
                        ) : null}
                      </div>
                    </Td>
                    <Td className="text-[0.8125rem] text-ink-soft capitalize">
                      {post.placement.toLowerCase()}
                    </Td>
                    <Td>
                      <StatusPill status={post.status} />
                    </Td>
                    <Td className="text-[0.8125rem] text-ink-muted tabular-nums">
                      {post.publishedAt ? formatDate(post.publishedAt) : "—"}
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1.5">
                        {post.status === "PUBLISHED" ? (
                          <a
                            href={publicPath(post)}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`View ${post.title} on the site`}
                            className="grid size-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
                          >
                            <ExternalLink className="size-3.5" />
                          </a>
                        ) : null}
                        <AdminButton tone="secondary" size="sm" onClick={() => togglePublish(post)}>
                          {post.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                        </AdminButton>
                        <button
                          type="button"
                          onClick={() => remove(post)}
                          aria-label={`Delete ${post.title}`}
                          className="grid size-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </TableShell>

          <AdminPagination
            page={data?.meta.page ?? 1}
            totalPages={data?.meta.totalPages ?? 1}
            total={data?.meta.total ?? 0}
            onPage={setPage}
          />
        </>
      )}

      {dialog}
    </>
  );
}
