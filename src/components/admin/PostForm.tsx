"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Save, Trash2 } from "lucide-react";
import {
  AdminButton,
  ErrorNote,
  Field,
  Input,
  Panel,
  Select,
  Spinner,
  StatusPill,
  Switch,
  Textarea,
  TokenInput,
  useConfirm,
  useToast,
} from "./ui";
import { ImageField } from "./MediaPicker";
import { RichTextEditor } from "./RichTextEditor";
import { SeoPanel } from "./SeoPanel";
import { useAsync } from "./useAsync";
import { AdminApiError, useApi } from "@/lib/admin";
import type { Category, Media, Placement, Post, Tag } from "@/lib/types";

/**
 * The post editor, shared by "new" and "edit".
 *
 * The API distinguishes creating from updating and publishing from saving; the
 * form does not make an editor think about that. They fill it in and press
 * Save, or Save and publish. Slug, publish timestamp, and redirect bookkeeping
 * are the backend's business.
 */

export interface PostDraft {
  placement: Placement;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: Media | null;
  ogImage: Media | null;
  categoryIds: string[];
  tagNames: string[];
  publishedAt: string;
  isFeatured: boolean;
  commentsEnabled: boolean;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  canonicalUrl: string;
  noIndex: boolean;
}

export function emptyDraft(): PostDraft {
  return {
    placement: "ARTICLE",
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    coverImage: null,
    ogImage: null,
    categoryIds: [],
    tagNames: [],
    publishedAt: "",
    isFeatured: false,
    commentsEnabled: true,
    metaTitle: "",
    metaDescription: "",
    metaKeywords: "",
    canonicalUrl: "",
    noIndex: false,
  };
}

export function draftFromPost(post: Post): PostDraft {
  return {
    placement: post.placement,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt ?? "",
    content: post.content ?? "",
    coverImage: post.coverImage,
    ogImage: post.ogImage,
    categoryIds: post.categories?.map((link) => link.categoryId) ?? [],
    tagNames: post.tags?.map((link) => link.tag.name) ?? [],
    // `datetime-local` wants `YYYY-MM-DDTHH:mm` with no zone or seconds.
    publishedAt: post.publishedAt ? post.publishedAt.slice(0, 16) : "",
    isFeatured: post.isFeatured,
    commentsEnabled: post.commentsEnabled,
    metaTitle: post.metaTitle ?? "",
    metaDescription: post.metaDescription ?? "",
    metaKeywords: post.metaKeywords ?? "",
    canonicalUrl: post.canonicalUrl ?? "",
    noIndex: post.noIndex,
  };
}

/** Strips empty optionals — the API rejects `""` where it wants a real value. */
function toPayload(draft: PostDraft) {
  const optional = (value: string) => (value.trim() ? value.trim() : undefined);

  return {
    placement: draft.placement,
    title: draft.title.trim(),
    slug: optional(draft.slug),
    excerpt: optional(draft.excerpt),
    content: draft.content,
    coverImageId: draft.coverImage?.id,
    ogImageId: draft.ogImage?.id,
    categoryIds: draft.categoryIds,
    tagNames: draft.tagNames,
    publishedAt: draft.publishedAt ? new Date(draft.publishedAt).toISOString() : undefined,
    isFeatured: draft.isFeatured,
    commentsEnabled: draft.commentsEnabled,
    metaTitle: optional(draft.metaTitle),
    metaDescription: optional(draft.metaDescription),
    metaKeywords: optional(draft.metaKeywords),
    canonicalUrl: optional(draft.canonicalUrl),
    noIndex: draft.noIndex,
  };
}

export function PostForm({
  postId,
  initial,
  status,
}: {
  /** Absent when creating. */
  postId?: string;
  initial: PostDraft;
  status?: "DRAFT" | "PUBLISHED";
}) {
  const api = useApi();
  const router = useRouter();
  const { notify } = useToast();
  const { confirm, dialog } = useConfirm();

  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const set = <K extends keyof PostDraft>(key: K, value: PostDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  // A post can carry ARTICLE and BLOG categories, so both scopes are offered.
  const taxonomy = useAsync(async () => {
    const [articles, blogs, tags] = await Promise.all([
      api.getPaged<{ categories: Category[] }>("/admin/categories", {
        scope: "ARTICLE",
        limit: 100,
      }),
      api.getPaged<{ categories: Category[] }>("/admin/categories", { scope: "BLOG", limit: 100 }),
      api.getPaged<{ tags: Tag[] }>("/admin/tags", { limit: 100 }),
    ]);
    return {
      categories: [...articles.data.categories, ...blogs.data.categories],
      tags: tags.data.tags,
    };
  }, []);

  const categories = useMemo(() => {
    const all = taxonomy.data?.categories ?? [];
    // Only offer categories whose scope this placement can actually use.
    if (draft.placement === "BOTH") return all;
    return all.filter((category) => category.scope === draft.placement);
  }, [taxonomy.data, draft.placement]);

  const save = async (thenPublish = false) => {
    setSaving(true);
    setFieldErrors({});
    setFormError(null);

    try {
      if (!draft.title.trim()) throw new AdminApiError(400, "VALIDATION_FAILED", "A title is required.");
      if (!draft.content.trim()) throw new AdminApiError(400, "VALIDATION_FAILED", "The body cannot be empty.");

      const payload = toPayload(draft);
      const saved = postId
        ? await api.patch<Post>(`/admin/posts/${postId}`, payload)
        : await api.post<Post>("/admin/posts", payload);

      if (thenPublish) await api.post(`/admin/posts/${saved.id}/publish`);

      notify(thenPublish ? "Post published." : "Post saved.");

      if (!postId) {
        router.replace(`/admin/posts/${saved.id}`);
      } else {
        router.refresh();
      }
    } catch (cause) {
      if (cause instanceof AdminApiError) {
        setFieldErrors(cause.fieldErrors);
        setFormError(cause.message);
      } else {
        setFormError("Something went wrong saving this post.");
      }
    } finally {
      setSaving(false);
    }
  };

  const unpublish = async () => {
    try {
      await api.post(`/admin/posts/${postId}/unpublish`);
      notify("Post moved back to draft.");
      router.refresh();
    } catch (cause) {
      notify(cause instanceof AdminApiError ? cause.message : "Could not unpublish.", "error");
    }
  };

  const remove = async () => {
    const confirmed = await confirm({
      title: "Delete this post?",
      body: `“${draft.title}” and its comments will be removed. This cannot be undone.`,
    });
    if (!confirmed) return;

    try {
      await api.del(`/admin/posts/${postId}`);
      notify("Post deleted.");
      router.push("/admin/posts");
    } catch (cause) {
      notify(cause instanceof AdminApiError ? cause.message : "Could not delete.", "error");
    }
  };

  const publicPath =
    draft.placement === "BLOG" ? `/blogs/${draft.slug}` : `/articles/${draft.slug}`;

  return (
    <>
      {formError ? (
        <div className="mb-4">
          <ErrorNote error={formError} />
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* ── the writing ── */}
        <div className="space-y-5 lg:col-span-2">
          <Panel>
            <div className="space-y-4">
              <Field label="Title" required error={fieldErrors.title} htmlFor="post-title">
                <Input
                  id="post-title"
                  value={draft.title}
                  onChange={(event) => set("title", event.target.value)}
                  placeholder="What is this piece called?"
                  className="text-base"
                />
              </Field>

              <Field
                label="Slug"
                hint={
                  postId
                    ? "Changing this leaves a permanent redirect from the old address."
                    : "Leave blank to generate one from the title."
                }
                error={fieldErrors.slug}
                htmlFor="post-slug"
              >
                <Input
                  id="post-slug"
                  value={draft.slug}
                  onChange={(event) => set("slug", event.target.value)}
                  placeholder="auto-generated-from-title"
                  className="font-mono text-[0.8125rem]"
                />
              </Field>

              <Field
                label="Excerpt"
                hint="One or two sentences. Used on cards and as the fallback meta description."
                error={fieldErrors.excerpt}
                htmlFor="post-excerpt"
              >
                <Textarea
                  id="post-excerpt"
                  rows={3}
                  value={draft.excerpt}
                  onChange={(event) => set("excerpt", event.target.value)}
                />
              </Field>
            </div>
          </Panel>

          <Panel title="Body" description="Saved as HTML and sanitised on the server.">
            <RichTextEditor value={draft.content} onChange={(html) => set("content", html)} />
            {fieldErrors.content ? (
              <p className="mt-2 text-[0.8125rem] text-red-600">{fieldErrors.content}</p>
            ) : null}
          </Panel>

          <SeoPanel
            metaTitle={draft.metaTitle}
            metaDescription={draft.metaDescription}
            metaKeywords={draft.metaKeywords}
            canonicalUrl={draft.canonicalUrl}
            noIndex={draft.noIndex}
            ogImage={draft.ogImage}
            fallbackTitle={draft.title}
            fallbackDescription={draft.excerpt}
            path={publicPath}
            onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
          />
        </div>

        {/* ── the settings ── */}
        <div className="space-y-5">
          <Panel title="Publishing">
            <div className="space-y-4">
              {status ? (
                <div className="flex items-center justify-between">
                  <span className="text-[0.8125rem] text-ink-muted">Current status</span>
                  <StatusPill status={status} />
                </div>
              ) : null}

              <Field label="Placement" hint="Where the piece is listed on the site.">
                <Select
                  value={draft.placement}
                  onChange={(event) => set("placement", event.target.value as Placement)}
                >
                  <option value="ARTICLE">Article — /articles</option>
                  <option value="BLOG">Blog — /blogs</option>
                  <option value="BOTH">Both — canonical under /articles</option>
                </Select>
              </Field>

              <Field
                label="Publish date"
                hint="A future date schedules it: public listings only show posts whose date has passed."
                error={fieldErrors.publishedAt}
              >
                <Input
                  type="datetime-local"
                  value={draft.publishedAt}
                  onChange={(event) => set("publishedAt", event.target.value)}
                />
              </Field>

              <Switch
                checked={draft.isFeatured}
                onChange={(next) => set("isFeatured", next)}
                label="Featured"
                hint="Eligible for the homepage rail."
              />

              <Switch
                checked={draft.commentsEnabled}
                onChange={(next) => set("commentsEnabled", next)}
                label="Comments open"
                hint="Signed-in readers may comment."
              />

              <div className="flex flex-wrap gap-2 border-t border-line pt-4">
                <AdminButton onClick={() => save(false)} loading={saving} className="flex-1">
                  <Save className="size-4" aria-hidden />
                  Save
                </AdminButton>

                {status === "PUBLISHED" ? (
                  <AdminButton tone="secondary" onClick={unpublish} disabled={saving}>
                    Unpublish
                  </AdminButton>
                ) : (
                  <AdminButton tone="secondary" onClick={() => save(true)} disabled={saving}>
                    Save &amp; publish
                  </AdminButton>
                )}
              </div>

              {postId && status === "PUBLISHED" ? (
                <a
                  href={publicPath}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-flame-600 transition-colors hover:text-flame-700"
                >
                  <ExternalLink className="size-3.5" aria-hidden />
                  View on the site
                </a>
              ) : null}
            </div>
          </Panel>

          <Panel title="Cover image">
            <ImageField
              label=""
              hint="Shown on cards and at the top of the article."
              value={draft.coverImage}
              onChange={(media) => set("coverImage", media)}
            />
          </Panel>

          <Panel title="Categories & tags">
            {taxonomy.loading ? (
              <Spinner label="Loading taxonomy" />
            ) : (
              <div className="space-y-4">
                <Field
                  label="Categories"
                  hint={
                    categories.length
                      ? "Tick every category this belongs to."
                      : "No categories for this placement yet — add some under Categories & tags."
                  }
                >
                  <div className="max-h-56 space-y-1.5 overflow-y-auto">
                    {categories.map((category) => (
                      <label
                        key={category.id}
                        className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1.5 text-sm transition-colors hover:bg-surface-sunken"
                      >
                        <input
                          type="checkbox"
                          checked={draft.categoryIds.includes(category.id)}
                          onChange={(event) =>
                            set(
                              "categoryIds",
                              event.target.checked
                                ? [...draft.categoryIds, category.id]
                                : draft.categoryIds.filter((id) => id !== category.id)
                            )
                          }
                          className="size-4 accent-[var(--color-flame-500)]"
                        />
                        <span className="min-w-0 flex-1 truncate text-ink">{category.name}</span>
                        <span className="text-[0.6875rem] text-ink-muted uppercase">
                          {category.scope}
                        </span>
                      </label>
                    ))}
                  </div>
                </Field>

                <Field label="Tags" hint="Tags are created as you use them.">
                  <TokenInput
                    values={draft.tagNames}
                    onChange={(next) => set("tagNames", next)}
                    suggestions={taxonomy.data?.tags.map((tag) => tag.name) ?? []}
                  />
                </Field>
              </div>
            )}
          </Panel>

          {postId ? (
            <Panel title="Danger zone">
              <AdminButton tone="danger" onClick={remove} className="w-full">
                <Trash2 className="size-4" aria-hidden />
                Delete this post
              </AdminButton>
            </Panel>
          ) : null}
        </div>
      </div>

      {dialog}
    </>
  );
}
