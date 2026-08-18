"use client";

import { useState } from "react";
import { ExternalLink, Pencil, Plus, Search, Star, Trash2 } from "lucide-react";
import {
  AdminButton,
  AdminEmpty,
  AdminPagination,
  ErrorNote,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  StatusPill,
  Switch,
  Textarea,
  useConfirm,
  useToast,
} from "@/components/admin/ui";
import { SeoPanel } from "@/components/admin/SeoPanel";
import { RequirePermission } from "@/components/admin/AdminShell";
import { useAsync, useDebounced } from "@/components/admin/useAsync";
import { AdminApiError, canEditModule, useApi } from "@/lib/admin";
import { formatDate, formatDuration } from "@/lib/format";
import type { Video, VideoCategory } from "@/lib/types";

/**
 * Videos are YouTube-only, so the editor is small: paste a URL and the backend
 * parses the id, fetches the thumbnail, and stores the duration. Everything
 * here fits a modal — there is no body to write.
 */

interface VideoDraft {
  title: string;
  slug: string;
  description: string;
  youtubeUrl: string;
  categoryId: string;
  publishedAt: string;
  isFeatured: boolean;
  metaTitle: string;
  metaDescription: string;
  noIndex: boolean;
}

const EMPTY: VideoDraft = {
  title: "",
  slug: "",
  description: "",
  youtubeUrl: "",
  categoryId: "",
  publishedAt: "",
  isFeatured: false,
  metaTitle: "",
  metaDescription: "",
  noIndex: false,
};

export default function VideosPage() {
  return (
    <RequirePermission allow={(viewer) => canEditModule(viewer, "videos")}>
      <VideosList />
    </RequirePermission>
  );
}

function VideosList() {
  const api = useApi();
  const { notify } = useToast();
  const { confirm, dialog } = useConfirm();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const query = useDebounced(search);

  const [editing, setEditing] = useState<Video | "new" | null>(null);
  const [draft, setDraft] = useState<VideoDraft>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const categories = useAsync(
    () => api.get<{ categories: VideoCategory[] }>("/admin/video-categories"),
    []
  );

  const { data, error, loading, reload } = useAsync(
    () =>
      api.getPaged<{ videos: Video[] }>("/admin/videos", {
        page,
        limit: 20,
        q: query || undefined,
        category: category || undefined,
      }),
    [page, query, category]
  );

  const open = (video: Video | "new") => {
    setFormError(null);
    setEditing(video);
    setDraft(
      video === "new"
        ? EMPTY
        : {
            title: video.title,
            slug: video.slug,
            description: video.description ?? "",
            // The API stores only the id, so rebuild a canonical watch URL for
            // the field. Re-submitting it is a no-op.
            youtubeUrl: `https://www.youtube.com/watch?v=${video.youtubeId}`,
            categoryId: video.categoryId ?? "",
            publishedAt: video.publishedAt ? video.publishedAt.slice(0, 16) : "",
            isFeatured: video.isFeatured,
            metaTitle: "",
            metaDescription: "",
            noIndex: video.noIndex,
          }
    );
  };

  const save = async () => {
    if (!draft.title.trim()) return setFormError("A title is required.");
    if (!draft.youtubeUrl.trim()) return setFormError("A YouTube URL is required.");

    setSaving(true);
    setFormError(null);

    const optional = (value: string) => (value.trim() ? value.trim() : undefined);
    const payload = {
      title: draft.title.trim(),
      slug: optional(draft.slug),
      description: optional(draft.description),
      youtubeUrl: draft.youtubeUrl.trim(),
      categoryId: optional(draft.categoryId),
      publishedAt: draft.publishedAt ? new Date(draft.publishedAt).toISOString() : undefined,
      isFeatured: draft.isFeatured,
      metaTitle: optional(draft.metaTitle),
      metaDescription: optional(draft.metaDescription),
      noIndex: draft.noIndex,
    };

    try {
      if (editing === "new") {
        await api.post("/admin/videos", payload);
        notify("Video added as a draft.");
      } else if (editing) {
        await api.patch(`/admin/videos/${editing.id}`, payload);
        notify("Video updated.");
      }
      setEditing(null);
      reload();
    } catch (cause) {
      setFormError(cause instanceof AdminApiError ? cause.message : "Could not save this video.");
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (video: Video) => {
    const next = video.status === "PUBLISHED" ? "unpublish" : "publish";
    try {
      await api.post(`/admin/videos/${video.id}/${next}`);
      notify(next === "publish" ? "Video published." : "Video moved back to draft.");
      reload();
    } catch (cause) {
      notify(cause instanceof AdminApiError ? cause.message : "Could not update.", "error");
    }
  };

  const remove = async (video: Video) => {
    const confirmed = await confirm({
      title: "Delete this video?",
      body: `“${video.title}” is removed from the site. The video on YouTube is untouched.`,
    });
    if (!confirmed) return;

    try {
      await api.del(`/admin/videos/${video.id}`);
      notify("Video deleted.");
      reload();
    } catch (cause) {
      notify(cause instanceof AdminApiError ? cause.message : "Could not delete.", "error");
    }
  };

  const videos = data?.data.videos ?? [];

  return (
    <>
      <PageHeader
        title="Videos"
        description="Talks, kirtan, and documentary footage. Everything is embedded from YouTube."
        actions={
          <AdminButton onClick={() => open("new")}>
            <Plus className="size-4" aria-hidden />
            Add video
          </AdminButton>
        }
      />

      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto]">
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
            placeholder="Search video titles…"
            aria-label="Search videos"
            className="pl-9"
          />
        </div>

        <Select
          value={category}
          aria-label="Filter by category"
          onChange={(event) => {
            setCategory(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All categories</option>
          {(categories.data?.categories ?? []).map((item) => (
            <option key={item.id} value={item.slug}>
              {item.name}
            </option>
          ))}
        </Select>
      </div>

      {error ? <ErrorNote error={error} onRetry={reload} /> : null}

      {loading && !data ? (
        <Spinner label="Loading videos" />
      ) : videos.length ? (
        <>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((video) => (
              <li
                key={video.id}
                className="overflow-hidden rounded-2xl border border-line bg-surface-raised"
              >
                <div className="relative aspect-video bg-surface-sunken">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={video.thumbnailUrl}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover"
                  />
                  {video.durationSec ? (
                    <span className="absolute right-2 bottom-2 rounded bg-navy-950/80 px-1.5 py-0.5 text-[0.6875rem] font-medium text-white tabular-nums">
                      {formatDuration(video.durationSec)}
                    </span>
                  ) : null}
                  <span className="absolute top-2 left-2">
                    <StatusPill status={video.status} />
                  </span>
                </div>

                <div className="p-4">
                  <p className="line-clamp-2 text-sm font-semibold text-ink">{video.title}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-[0.75rem] text-ink-muted">
                    {video.category ? <span>{video.category.name}</span> : null}
                    {video.publishedAt ? <span>{formatDate(video.publishedAt)}</span> : null}
                    {video.isFeatured ? (
                      <span className="inline-flex items-center gap-1 text-flame-600">
                        <Star className="size-3 fill-current" aria-hidden />
                        Featured
                      </span>
                    ) : null}
                  </p>

                  <div className="mt-3 flex items-center gap-1.5">
                    <AdminButton
                      tone="secondary"
                      size="sm"
                      onClick={() => togglePublish(video)}
                      className="flex-1"
                    >
                      {video.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                    </AdminButton>
                    <button
                      type="button"
                      onClick={() => open(video)}
                      aria-label={`Edit ${video.title}`}
                      className="grid size-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <a
                      href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Open on YouTube"
                      className="grid size-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
                    >
                      <ExternalLink className="size-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => remove(video)}
                      aria-label={`Delete ${video.title}`}
                      className="grid size-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <AdminPagination
            page={data?.meta.page ?? 1}
            totalPages={data?.meta.totalPages ?? 1}
            total={data?.meta.total ?? 0}
            onPage={setPage}
          />
        </>
      ) : (
        <AdminEmpty
          title={query || category ? "No videos match" : "No videos yet"}
          description="Paste a YouTube URL and the rest is filled in for you."
          action={<AdminButton onClick={() => open("new")}>Add a video</AdminButton>}
        />
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Add video" : "Edit video"}
        size="lg"
        footer={
          <>
            <AdminButton tone="ghost" onClick={() => setEditing(null)}>
              Cancel
            </AdminButton>
            <AdminButton onClick={save} loading={saving}>
              Save
            </AdminButton>
          </>
        }
      >
        <div className="space-y-4">
          {formError ? <ErrorNote error={formError} /> : null}

          <Field
            label="YouTube URL"
            required
            hint="Any form works — watch, youtu.be, shorts, or embed."
          >
            <Input
              autoFocus
              value={draft.youtubeUrl}
              onChange={(event) => setDraft({ ...draft, youtubeUrl: event.target.value })}
              placeholder="https://www.youtube.com/watch?v=…"
            />
          </Field>

          <Field label="Title" required>
            <Input
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            />
          </Field>

          <Field label="Description">
            <Textarea
              rows={3}
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category">
              <Select
                value={draft.categoryId}
                onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}
              >
                <option value="">Uncategorised</option>
                {(categories.data?.categories ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Publish date" hint="A future date schedules it.">
              <Input
                type="datetime-local"
                value={draft.publishedAt}
                onChange={(event) => setDraft({ ...draft, publishedAt: event.target.value })}
              />
            </Field>
          </div>

          <Switch
            checked={draft.isFeatured}
            onChange={(next) => setDraft({ ...draft, isFeatured: next })}
            label="Featured"
            hint="Eligible for the homepage rail."
          />

          <SeoPanel
            metaTitle={draft.metaTitle}
            metaDescription={draft.metaDescription}
            noIndex={draft.noIndex}
            fallbackTitle={draft.title}
            fallbackDescription={draft.description}
            path={`/videos/${draft.slug || "…"}`}
            showKeywords={false}
            showCanonical={false}
            showOgImage={false}
            onChange={(patch) => setDraft({ ...draft, ...patch })}
          />
        </div>
      </Modal>

      {dialog}
    </>
  );
}
