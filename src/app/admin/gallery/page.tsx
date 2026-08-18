"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Images, Plus, Trash2 } from "lucide-react";
import {
  AdminButton,
  AdminEmpty,
  AdminPagination,
  ErrorNote,
  Field,
  Input,
  Modal,
  PageHeader,
  Spinner,
  Switch,
  Textarea,
  useConfirm,
  useToast,
} from "@/components/admin/ui";
import { ImageField } from "@/components/admin/MediaPicker";
import { RequirePermission } from "@/components/admin/AdminShell";
import { useAsync } from "@/components/admin/useAsync";
import { AdminApiError, canEditModule, useApi } from "@/lib/admin";
import { cn, mediaUrl } from "@/lib/format";
import type { GallerySegment, Media } from "@/lib/types";

/**
 * Gallery segments. A segment is a set of photographs gathered around a place,
 * a season, or an observance; its images are managed on its own screen because
 * that is a different job from deciding which sets exist.
 */

interface SegmentDraft {
  name: string;
  slug: string;
  description: string;
  coverImage: Media | null;
  isPublished: boolean;
}

const EMPTY: SegmentDraft = {
  name: "",
  slug: "",
  description: "",
  coverImage: null,
  isPublished: true,
};

export default function GalleryPage() {
  return (
    <RequirePermission allow={(viewer) => canEditModule(viewer, "gallery")}>
      <Segments />
    </RequirePermission>
  );
}

function Segments() {
  const api = useApi();
  const { notify } = useToast();
  const { confirm, dialog } = useConfirm();

  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<SegmentDraft>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, error, loading, reload } = useAsync(
    () => api.getPaged<{ segments: GallerySegment[] }>("/admin/gallery", { page, limit: 24 }),
    [page]
  );

  const create = async () => {
    if (!draft.name.trim()) return setFormError("A name is required.");

    setSaving(true);
    setFormError(null);

    try {
      await api.post("/admin/gallery", {
        name: draft.name.trim(),
        slug: draft.slug.trim() || undefined,
        description: draft.description.trim() || undefined,
        coverImageId: draft.coverImage?.id,
        isPublished: draft.isPublished,
      });
      notify("Segment created.");
      setCreating(false);
      setDraft(EMPTY);
      reload();
    } catch (cause) {
      setFormError(cause instanceof AdminApiError ? cause.message : "Could not create the segment.");
    } finally {
      setSaving(false);
    }
  };

  const togglePublished = async (segment: GallerySegment) => {
    try {
      await api.patch(`/admin/gallery/${segment.id}`, { isPublished: !segment.isPublished });
      notify(segment.isPublished ? "Segment hidden." : "Segment published.");
      reload();
    } catch (cause) {
      notify(cause instanceof AdminApiError ? cause.message : "Could not update.", "error");
    }
  };

  const remove = async (segment: GallerySegment) => {
    const confirmed = await confirm({
      title: `Delete “${segment.name}”?`,
      body: "The segment and its image arrangement go. The photographs stay in the media library.",
    });
    if (!confirmed) return;

    try {
      await api.del(`/admin/gallery/${segment.id}`);
      notify("Segment deleted.");
      reload();
    } catch (cause) {
      notify(cause instanceof AdminApiError ? cause.message : "Could not delete.", "error");
    }
  };

  const segments = data?.data.segments ?? [];

  return (
    <>
      <PageHeader
        title="Gallery"
        description="Photographic segments. Open one to add and arrange its images."
        actions={
          <AdminButton
            onClick={() => {
              setDraft(EMPTY);
              setFormError(null);
              setCreating(true);
            }}
          >
            <Plus className="size-4" aria-hidden />
            New segment
          </AdminButton>
        }
      />

      {error ? <ErrorNote error={error} onRetry={reload} /> : null}

      {loading && !data ? (
        <Spinner label="Loading segments" />
      ) : segments.length ? (
        <>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {segments.map((segment) => {
              const cover = mediaUrl(segment.coverImage, "medium");
              return (
                <li
                  key={segment.id}
                  className={cn(
                    "overflow-hidden rounded-2xl border bg-surface-raised transition-all hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgb(11_20_48_/_0.04),0_10px_30px_-14px_rgb(11_20_48_/_0.18)]",
                    segment.isPublished ? "border-line" : "border-dashed border-line-strong"
                  )}
                >
                  <Link href={`/admin/gallery/${segment.id}`} className="block">
                    <span className="block aspect-4/3 bg-surface-sunken">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cover} alt="" loading="lazy" className="size-full object-cover" />
                      ) : (
                        <span className="grid size-full place-items-center text-ink-muted">
                          <Images className="size-7" aria-hidden />
                        </span>
                      )}
                    </span>
                  </Link>

                  <div className="p-4">
                    <Link
                      href={`/admin/gallery/${segment.id}`}
                      className="text-sm font-semibold text-ink transition-colors hover:text-flame-600"
                    >
                      {segment.name}
                    </Link>
                    <p className="mt-0.5 text-[0.75rem] text-ink-muted">
                      {segment._count?.images ?? segment.images?.length ?? 0} images ·{" "}
                      {segment.isPublished ? "Published" : "Hidden"}
                    </p>

                    <div className="mt-3 flex items-center gap-1.5">
                      <Link
                        href={`/admin/gallery/${segment.id}`}
                        className="flex-1 rounded-lg border border-line-strong px-3 py-1.5 text-center text-[0.8125rem] font-medium text-ink transition-colors hover:border-navy-400 hover:bg-surface-sunken"
                      >
                        Manage images
                      </Link>
                      <button
                        type="button"
                        onClick={() => togglePublished(segment)}
                        aria-label={segment.isPublished ? "Hide segment" : "Publish segment"}
                        className="grid size-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
                      >
                        {segment.isPublished ? (
                          <Eye className="size-4" />
                        ) : (
                          <EyeOff className="size-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(segment)}
                        aria-label={`Delete ${segment.name}`}
                        className="grid size-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
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
          title="No segments yet"
          description="A segment is one set of photographs — a place, a season, an observance."
          action={<AdminButton onClick={() => setCreating(true)}>Create the first segment</AdminButton>}
        />
      )}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="New segment"
        size="md"
        footer={
          <>
            <AdminButton tone="ghost" onClick={() => setCreating(false)}>
              Cancel
            </AdminButton>
            <AdminButton onClick={create} loading={saving}>
              Create
            </AdminButton>
          </>
        }
      >
        <div className="space-y-4">
          {formError ? <ErrorNote error={formError} /> : null}

          <Field label="Name" required>
            <Input
              autoFocus
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              placeholder="Kartik at the kunda"
            />
          </Field>

          <Field label="Slug" hint="Generated from the name if blank.">
            <Input
              value={draft.slug}
              onChange={(event) => setDraft({ ...draft, slug: event.target.value })}
              className="font-mono text-[0.8125rem]"
            />
          </Field>

          <Field label="Description" hint="Shown on the segment's card and page.">
            <Textarea
              rows={3}
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
            />
          </Field>

          <ImageField
            label="Cover image"
            hint="The card image in the gallery index."
            value={draft.coverImage}
            onChange={(media) => setDraft({ ...draft, coverImage: media })}
          />

          <Switch
            checked={draft.isPublished}
            onChange={(next) => setDraft({ ...draft, isPublished: next })}
            label="Published"
            hint="Visible in the public gallery."
          />
        </div>
      </Modal>

      {dialog}
    </>
  );
}
