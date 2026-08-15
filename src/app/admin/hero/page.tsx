"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import {
  AdminButton,
  AdminEmpty,
  ErrorNote,
  Field,
  InfoNote,
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
import { AdminApiError, isStaff, useApi } from "@/lib/admin";
import { cn, mediaUrl } from "@/lib/format";
import type { HeroSlide, Media } from "@/lib/types";

/**
 * Homepage hero slides.
 *
 * The slide's image no longer fills the hero — the 3D mandala does — so it is
 * used as a wash behind the words, setting the colour of the section. That is
 * worth saying on the screen, because it changes what makes a good choice of
 * picture.
 */

interface SlideDraft {
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaUrl: string;
  image: Media | null;
  isActive: boolean;
}

const EMPTY: SlideDraft = {
  title: "",
  subtitle: "",
  ctaLabel: "",
  ctaUrl: "",
  image: null,
  isActive: true,
};

export default function HeroPage() {
  return (
    <RequirePermission allow={isStaff}>
      <HeroSlides />
    </RequirePermission>
  );
}

function HeroSlides() {
  const api = useApi();
  const { notify } = useToast();
  const { confirm, dialog } = useConfirm();

  const [editing, setEditing] = useState<HeroSlide | "new" | null>(null);
  const [draft, setDraft] = useState<SlideDraft>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, error, loading, reload } = useAsync(
    () => api.get<{ slides: HeroSlide[] }>("/admin/hero"),
    []
  );

  const slides = [...(data?.slides ?? [])].sort((a, b) => a.order - b.order);

  const open = (slide: HeroSlide | "new") => {
    setFormError(null);
    setEditing(slide);
    setDraft(
      slide === "new"
        ? EMPTY
        : {
            title: slide.title,
            subtitle: slide.subtitle ?? "",
            ctaLabel: slide.ctaLabel ?? "",
            ctaUrl: slide.ctaUrl ?? "",
            image: slide.image,
            isActive: slide.isActive,
          }
    );
  };

  const save = async () => {
    if (!draft.title.trim()) return setFormError("A headline is required.");
    if (!draft.image) return setFormError("Choose a background image.");

    setSaving(true);
    setFormError(null);

    const optional = (value: string) => (value.trim() ? value.trim() : undefined);
    const payload = {
      title: draft.title.trim(),
      subtitle: optional(draft.subtitle),
      imageId: draft.image.id,
      ctaLabel: optional(draft.ctaLabel),
      ctaUrl: optional(draft.ctaUrl),
      isActive: draft.isActive,
      // New slides go to the end of the run.
      ...(editing === "new" ? { order: slides.length } : {}),
    };

    try {
      if (editing === "new") {
        await api.post("/admin/hero", payload);
        notify("Slide added.");
      } else if (editing) {
        await api.patch(`/admin/hero/${editing.id}`, payload);
        notify("Slide updated.");
      }
      setEditing(null);
      reload();
    } catch (cause) {
      setFormError(cause instanceof AdminApiError ? cause.message : "Could not save this slide.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (slide: HeroSlide) => {
    try {
      await api.patch(`/admin/hero/${slide.id}`, { isActive: !slide.isActive });
      notify(slide.isActive ? "Slide hidden." : "Slide shown.");
      reload();
    } catch (cause) {
      notify(cause instanceof AdminApiError ? cause.message : "Could not update.", "error");
    }
  };

  /**
   * Swaps the two slides' `order` values. The API has no reorder endpoint for
   * hero slides, so this is two ordinary updates — fine at this scale, where a
   * site has a handful of slides rather than hundreds.
   */
  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= slides.length) return;

    const a = slides[index];
    const b = slides[target];

    try {
      await Promise.all([
        api.patch(`/admin/hero/${a.id}`, { order: b.order }),
        api.patch(`/admin/hero/${b.id}`, { order: a.order }),
      ]);
      reload();
    } catch (cause) {
      notify(cause instanceof AdminApiError ? cause.message : "Could not reorder.", "error");
    }
  };

  const remove = async (slide: HeroSlide) => {
    const confirmed = await confirm({
      title: "Delete this slide?",
      body: `“${slide.title}” is removed from the homepage. The image stays in the media library.`,
    });
    if (!confirmed) return;

    try {
      await api.del(`/admin/hero/${slide.id}`);
      notify("Slide deleted.");
      reload();
    } catch (cause) {
      notify(cause instanceof AdminApiError ? cause.message : "Could not delete.", "error");
    }
  };

  return (
    <>
      <PageHeader
        title="Hero slides"
        description="The rotating headline at the top of the homepage."
        actions={
          <AdminButton onClick={() => open("new")}>
            <Plus className="size-4" aria-hidden />
            Add slide
          </AdminButton>
        }
      />

      <div className="mb-5">
        <InfoNote>
          The homepage hero is a white composition with a three-dimensional mandala beside the
          words. A slide&apos;s image is washed back to about fifteen percent behind the text, so it
          sets the mood and the colour rather than carrying detail. Wide, softly lit photographs
          work; busy or high-contrast ones do not. If no slide is active, the homepage falls back to
          a standing headline.
        </InfoNote>
      </div>

      {error ? <ErrorNote error={error} onRetry={reload} /> : null}

      {loading && !data ? (
        <Spinner label="Loading slides" />
      ) : slides.length ? (
        <ul className="space-y-3">
          {slides.map((slide, index) => {
            const preview = mediaUrl(slide.image, "medium");
            return (
              <li
                key={slide.id}
                className={cn(
                  "flex flex-wrap items-center gap-4 rounded-2xl border bg-surface-raised p-4",
                  slide.isActive ? "border-line" : "border-dashed border-line-strong opacity-70"
                )}
              >
                <span className="flex shrink-0 flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label="Move slide up"
                    className="grid size-6 place-items-center rounded text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ArrowUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === slides.length - 1}
                    aria-label="Move slide down"
                    className="grid size-6 place-items-center rounded text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ArrowDown className="size-3.5" />
                  </button>
                </span>

                <span className="h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-surface-sunken">
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt="" className="size-full object-cover" />
                  ) : null}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{slide.title}</p>
                  {slide.subtitle ? (
                    <p className="mt-0.5 line-clamp-1 text-[0.8125rem] text-ink-muted">
                      {slide.subtitle}
                    </p>
                  ) : null}
                  {slide.ctaLabel && slide.ctaUrl ? (
                    <p className="mt-1 truncate text-[0.75rem] text-flame-600">
                      {slide.ctaLabel} → {slide.ctaUrl}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleActive(slide)}
                    aria-label={slide.isActive ? "Hide this slide" : "Show this slide"}
                    title={slide.isActive ? "Showing on the homepage" : "Hidden"}
                    className="grid size-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
                  >
                    {slide.isActive ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => open(slide)}
                    aria-label={`Edit ${slide.title}`}
                    className="grid size-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(slide)}
                    aria-label={`Delete ${slide.title}`}
                    className="grid size-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <AdminEmpty
          title="No hero slides"
          description="Until you add one, the homepage shows its standing headline."
          action={<AdminButton onClick={() => open("new")}>Add the first slide</AdminButton>}
        />
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Add slide" : "Edit slide"}
        size="md"
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

          <Field label="Headline" required hint="Rendered as the page's h1 while this slide shows.">
            <Input
              autoFocus
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            />
          </Field>

          <Field label="Subtitle">
            <Textarea
              rows={2}
              value={draft.subtitle}
              onChange={(event) => setDraft({ ...draft, subtitle: event.target.value })}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Button label">
              <Input
                value={draft.ctaLabel}
                onChange={(event) => setDraft({ ...draft, ctaLabel: event.target.value })}
                placeholder="Start with the field guide"
              />
            </Field>

            <Field label="Button link" hint="Relative, e.g. /research.">
              <Input
                value={draft.ctaUrl}
                onChange={(event) => setDraft({ ...draft, ctaUrl: event.target.value })}
                placeholder="/research"
              />
            </Field>
          </div>

          <ImageField
            label="Background image"
            required
            hint="Washed back behind the words. Wide and soft works best."
            value={draft.image}
            onChange={(media) => setDraft({ ...draft, image: media })}
          />

          <Switch
            checked={draft.isActive}
            onChange={(next) => setDraft({ ...draft, isActive: next })}
            label="Show on the homepage"
            hint="Turn off to keep a slide without publishing it."
          />
        </div>
      </Modal>

      {dialog}
    </>
  );
}
