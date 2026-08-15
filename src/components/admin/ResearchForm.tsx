"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, FileText, GripVertical, Save, Trash2, Upload, X } from "lucide-react";
import {
  AdminButton,
  ErrorNote,
  Field,
  Input,
  InfoNote,
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
import { SeoPanel } from "./SeoPanel";
import { useAsync } from "./useAsync";
import { AdminApiError, useApi, type ResearchFileRow } from "@/lib/admin";
import { formatBytes } from "@/lib/format";
import type { Author, Category, Media, Research, Tag } from "@/lib/types";

/**
 * The publication editor.
 *
 * Research differs from a post in two ways that shape this form: the body is a
 * PDF rather than prose, and authorship is an ordered list of people who may
 * not have accounts. Files are therefore managed against a saved record only —
 * there is nothing to attach a PDF to until the publication exists.
 */

interface AuthorLink {
  authorId: string;
  order: number;
  isCorresponding: boolean;
}

export interface ResearchDraft {
  title: string;
  slug: string;
  abstract: string;
  categoryId: string;
  authorIds: AuthorLink[];
  tagNames: string[];
  keywords: string[];
  publishedAt: string;
  isFeatured: boolean;
  doi: string;
  journal: string;
  volume: string;
  issue: string;
  pages: string;
  publicationYear: string;
  metaTitle: string;
  metaDescription: string;
  ogImage: Media | null;
  noIndex: boolean;
}

export function emptyResearchDraft(): ResearchDraft {
  return {
    title: "",
    slug: "",
    abstract: "",
    categoryId: "",
    authorIds: [],
    tagNames: [],
    keywords: [],
    publishedAt: "",
    isFeatured: false,
    doi: "",
    journal: "",
    volume: "",
    issue: "",
    pages: "",
    publicationYear: "",
    metaTitle: "",
    metaDescription: "",
    ogImage: null,
    noIndex: false,
  };
}

export function draftFromResearch(item: Research): ResearchDraft {
  return {
    title: item.title,
    slug: item.slug,
    abstract: item.abstract,
    categoryId: item.categoryId ?? "",
    authorIds:
      item.authors?.map((link) => ({
        authorId: link.authorId,
        order: link.order,
        isCorresponding: link.isCorresponding,
      })) ?? [],
    tagNames: item.tags?.map((link) => link.tag.name) ?? [],
    keywords: item.keywords ?? [],
    publishedAt: item.publishedAt ? item.publishedAt.slice(0, 16) : "",
    isFeatured: item.isFeatured,
    doi: item.doi ?? "",
    journal: item.journal ?? "",
    volume: item.volume ?? "",
    issue: item.issue ?? "",
    pages: item.pages ?? "",
    publicationYear: item.publicationYear ? String(item.publicationYear) : "",
    metaTitle: item.metaTitle ?? "",
    metaDescription: item.metaDescription ?? "",
    ogImage: item.ogImage ?? null,
    noIndex: item.noIndex,
  };
}

function toPayload(draft: ResearchDraft) {
  const optional = (value: string) => (value.trim() ? value.trim() : undefined);
  const year = Number.parseInt(draft.publicationYear, 10);

  return {
    title: draft.title.trim(),
    slug: optional(draft.slug),
    abstract: draft.abstract.trim(),
    categoryId: optional(draft.categoryId),
    // Re-derive `order` from position so it always matches what is on screen.
    authorIds: draft.authorIds.map((link, index) => ({ ...link, order: index })),
    tagNames: draft.tagNames,
    keywords: draft.keywords,
    publishedAt: draft.publishedAt ? new Date(draft.publishedAt).toISOString() : undefined,
    isFeatured: draft.isFeatured,
    doi: optional(draft.doi),
    journal: optional(draft.journal),
    volume: optional(draft.volume),
    issue: optional(draft.issue),
    pages: optional(draft.pages),
    publicationYear: Number.isFinite(year) ? year : undefined,
    metaTitle: optional(draft.metaTitle),
    metaDescription: optional(draft.metaDescription),
    ogImageId: draft.ogImage?.id,
    noIndex: draft.noIndex,
  };
}

export function ResearchForm({
  researchId,
  initial,
  status,
  files: initialFiles = [],
  onFilesChanged,
}: {
  researchId?: string;
  initial: ResearchDraft;
  status?: "DRAFT" | "PUBLISHED";
  files?: ResearchFileRow[];
  onFilesChanged?: () => void;
}) {
  const api = useApi();
  const router = useRouter();
  const { notify } = useToast();
  const { confirm, dialog } = useConfirm();

  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof ResearchDraft>(key: K, value: ResearchDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const lookups = useAsync(async () => {
    const [authors, categories, tags] = await Promise.all([
      api.getPaged<{ authors: Author[] }>("/admin/authors", { limit: 100 }),
      api.getPaged<{ categories: Category[] }>("/admin/categories", {
        scope: "RESEARCH",
        limit: 100,
      }),
      api.getPaged<{ tags: Tag[] }>("/admin/tags", { limit: 100 }),
    ]);
    return {
      authors: authors.data.authors,
      categories: categories.data.categories,
      tags: tags.data.tags,
    };
  }, []);

  const authorById = (id: string) => lookups.data?.authors.find((author) => author.id === id);

  const addAuthor = (authorId: string) => {
    if (!authorId || draft.authorIds.some((link) => link.authorId === authorId)) return;
    set("authorIds", [
      ...draft.authorIds,
      { authorId, order: draft.authorIds.length, isCorresponding: false },
    ]);
  };

  const moveAuthor = (index: number, direction: -1 | 1) => {
    const next = [...draft.authorIds];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    set("authorIds", next);
  };

  const save = async (thenPublish = false) => {
    setSaving(true);
    setFormError(null);
    setFieldErrors({});

    try {
      if (!draft.title.trim()) throw new AdminApiError(400, "VALIDATION_FAILED", "A title is required.");
      if (!draft.abstract.trim()) {
        throw new AdminApiError(400, "VALIDATION_FAILED", "An abstract is required — it is the public part.");
      }

      const payload = toPayload(draft);
      const saved = researchId
        ? await api.patch<Research>(`/admin/research/${researchId}`, payload)
        : await api.post<Research>("/admin/research", payload);

      if (thenPublish) await api.post(`/admin/research/${saved.id}/publish`);

      notify(thenPublish ? "Publication is live." : "Publication saved.");

      if (!researchId) router.replace(`/admin/research/${saved.id}`);
      else router.refresh();
    } catch (cause) {
      if (cause instanceof AdminApiError) {
        setFieldErrors(cause.fieldErrors);
        setFormError(cause.message);
      } else {
        setFormError("Something went wrong saving this publication.");
      }
    } finally {
      setSaving(false);
    }
  };

  const unpublish = async () => {
    try {
      await api.post(`/admin/research/${researchId}/unpublish`);
      notify("Moved back to draft.");
      router.refresh();
    } catch (cause) {
      notify(cause instanceof AdminApiError ? cause.message : "Could not unpublish.", "error");
    }
  };

  const remove = async () => {
    const confirmed = await confirm({
      title: "Delete this publication?",
      body: `“${draft.title}” and its attached PDFs will be removed. This cannot be undone.`,
    });
    if (!confirmed) return;

    try {
      await api.del(`/admin/research/${researchId}`);
      notify("Publication deleted.");
      router.push("/admin/research");
    } catch (cause) {
      notify(cause instanceof AdminApiError ? cause.message : "Could not delete.", "error");
    }
  };

  return (
    <>
      {formError ? (
        <div className="mb-4">
          <ErrorNote error={formError} />
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Panel>
            <div className="space-y-4">
              <Field label="Title" required error={fieldErrors.title}>
                <Input
                  value={draft.title}
                  onChange={(event) => set("title", event.target.value)}
                  placeholder="Full title of the paper"
                />
              </Field>

              <Field
                label="Slug"
                hint={researchId ? "Changing this leaves a permanent redirect." : "Generated from the title if blank."}
                error={fieldErrors.slug}
              >
                <Input
                  value={draft.slug}
                  onChange={(event) => set("slug", event.target.value)}
                  className="font-mono text-[0.8125rem]"
                />
              </Field>

              <Field
                label="Abstract"
                required
                hint="Public to everyone, including readers who are not signed in."
                error={fieldErrors.abstract}
              >
                <Textarea
                  rows={8}
                  value={draft.abstract}
                  onChange={(event) => set("abstract", event.target.value)}
                />
              </Field>
            </div>
          </Panel>

          <Panel
            title="Authors"
            description="Ordered as they should be credited. Authors are people, not accounts — add them under Authors first."
          >
            {lookups.loading ? (
              <Spinner />
            ) : (
              <div className="space-y-3">
                {draft.authorIds.length ? (
                  <ul className="space-y-2">
                    {draft.authorIds.map((link, index) => {
                      const author = authorById(link.authorId);
                      return (
                        <li
                          key={link.authorId}
                          className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5"
                        >
                          <span className="flex flex-col text-ink-muted">
                            <button
                              type="button"
                              onClick={() => moveAuthor(index, -1)}
                              disabled={index === 0}
                              aria-label="Move up"
                              className="leading-none disabled:opacity-30"
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              onClick={() => moveAuthor(index, 1)}
                              disabled={index === draft.authorIds.length - 1}
                              aria-label="Move down"
                              className="leading-none disabled:opacity-30"
                            >
                              ▼
                            </button>
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-ink">
                              {author?.name ?? "Unknown author"}
                            </span>
                            {author?.affiliation ? (
                              <span className="block truncate text-[0.75rem] text-ink-muted">
                                {author.affiliation}
                              </span>
                            ) : null}
                          </span>

                          <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-[0.75rem] text-ink-soft">
                            <input
                              type="checkbox"
                              checked={link.isCorresponding}
                              onChange={(event) =>
                                set(
                                  "authorIds",
                                  draft.authorIds.map((item, itemIndex) =>
                                    itemIndex === index
                                      ? { ...item, isCorresponding: event.target.checked }
                                      : item
                                  )
                                )
                              }
                              className="size-3.5 accent-[var(--color-flame-500)]"
                            />
                            Corresponding
                          </label>

                          <button
                            type="button"
                            onClick={() =>
                              set(
                                "authorIds",
                                draft.authorIds.filter((_, itemIndex) => itemIndex !== index)
                              )
                            }
                            aria-label={`Remove ${author?.name ?? "author"}`}
                            className="grid size-7 shrink-0 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                          >
                            <X className="size-3.5" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-[0.8125rem] text-ink-muted">No authors credited yet.</p>
                )}

                <Select
                  value=""
                  aria-label="Add an author"
                  onChange={(event) => addAuthor(event.target.value)}
                >
                  <option value="">Add an author…</option>
                  {(lookups.data?.authors ?? [])
                    .filter((author) => !draft.authorIds.some((link) => link.authorId === author.id))
                    .map((author) => (
                      <option key={author.id} value={author.id}>
                        {author.name}
                        {author.affiliation ? ` — ${author.affiliation}` : ""}
                      </option>
                    ))}
                </Select>
              </div>
            )}
          </Panel>

          {researchId ? (
            <FilesPanel
              researchId={researchId}
              files={initialFiles}
              onChanged={onFilesChanged ?? (() => router.refresh())}
            />
          ) : (
            <Panel title="Files">
              <InfoNote>
                Save the publication first, then attach its PDFs here. Uploads go to the private
                bucket and are only ever served through a short-lived signed URL.
              </InfoNote>
            </Panel>
          )}

          <Panel title="Citation" description="Optional. Shown on the publication page and in its structured data.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="DOI">
                <Input
                  value={draft.doi}
                  onChange={(event) => set("doi", event.target.value)}
                  placeholder="10.1000/xyz123"
                  className="font-mono text-[0.8125rem]"
                />
              </Field>
              <Field label="Journal">
                <Input value={draft.journal} onChange={(event) => set("journal", event.target.value)} />
              </Field>
              <Field label="Volume">
                <Input value={draft.volume} onChange={(event) => set("volume", event.target.value)} />
              </Field>
              <Field label="Issue">
                <Input value={draft.issue} onChange={(event) => set("issue", event.target.value)} />
              </Field>
              <Field label="Pages">
                <Input
                  value={draft.pages}
                  onChange={(event) => set("pages", event.target.value)}
                  placeholder="112–140"
                />
              </Field>
              <Field label="Publication year">
                <Input
                  type="number"
                  inputMode="numeric"
                  value={draft.publicationYear}
                  onChange={(event) => set("publicationYear", event.target.value)}
                  placeholder="2026"
                />
              </Field>
            </div>
          </Panel>

          <SeoPanel
            metaTitle={draft.metaTitle}
            metaDescription={draft.metaDescription}
            noIndex={draft.noIndex}
            ogImage={draft.ogImage}
            fallbackTitle={draft.title}
            fallbackDescription={draft.abstract}
            path={`/research/${draft.slug}`}
            showKeywords={false}
            showCanonical={false}
            onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
          />
        </div>

        <div className="space-y-5">
          <Panel title="Publishing">
            <div className="space-y-4">
              {status ? (
                <div className="flex items-center justify-between">
                  <span className="text-[0.8125rem] text-ink-muted">Current status</span>
                  <StatusPill status={status} />
                </div>
              ) : null}

              <Field label="Category">
                <Select
                  value={draft.categoryId}
                  onChange={(event) => set("categoryId", event.target.value)}
                >
                  <option value="">Uncategorised</option>
                  {(lookups.data?.categories ?? []).map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Publish date" hint="A future date schedules it.">
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

              {researchId && status === "PUBLISHED" ? (
                <a
                  href={`/research/${draft.slug}`}
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

          <Panel title="Tags & keywords">
            <div className="space-y-4">
              <Field label="Tags" hint="Shared with posts. Used for navigation.">
                <TokenInput
                  values={draft.tagNames}
                  onChange={(next) => set("tagNames", next)}
                  suggestions={lookups.data?.tags.map((tag) => tag.name) ?? []}
                />
              </Field>

              <Field label="Keywords" hint="Academic keywords, as printed with the paper.">
                <TokenInput values={draft.keywords} onChange={(next) => set("keywords", next)} />
              </Field>
            </div>
          </Panel>

          {researchId ? (
            <Panel title="Danger zone">
              <AdminButton tone="danger" onClick={remove} className="w-full">
                <Trash2 className="size-4" aria-hidden />
                Delete this publication
              </AdminButton>
            </Panel>
          ) : null}
        </div>
      </div>

      {dialog}
    </>
  );
}

/** PDF attachments. Only reachable once the publication has an id. */
function FilesPanel({
  researchId,
  files,
  onChanged,
}: {
  researchId: string;
  files: ResearchFileRow[];
  onChanged: () => void;
}) {
  const api = useApi();
  const { notify } = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    setBusy(true);
    const form = new FormData();
    form.append("file", file, file.name);
    if (label.trim()) form.append("label", label.trim());

    try {
      await api.upload(`/admin/research/${researchId}/files`, form);
      notify("PDF attached.");
      setLabel("");
      onChanged();
    } catch (cause) {
      notify(cause instanceof AdminApiError ? cause.message : "Upload failed.", "error");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const remove = async (file: ResearchFileRow) => {
    if (!window.confirm(`Detach “${file.label}”? The PDF is deleted from storage.`)) return;
    try {
      await api.del(`/admin/research/files/${file.id}`);
      notify("File removed.");
      onChanged();
    } catch (cause) {
      notify(cause instanceof AdminApiError ? cause.message : "Could not remove.", "error");
    }
  };

  return (
    <Panel
      title="Attached PDFs"
      description="Stored privately. Signed-in readers get a 60-second signed URL, and every open is recorded."
    >
      <div className="space-y-4">
        {files.length ? (
          <ul className="space-y-2">
            {files.map((file) => (
              <li
                key={file.id}
                className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5"
              >
                <GripVertical className="size-4 shrink-0 text-ink-muted" aria-hidden />
                <FileText className="size-4 shrink-0 text-flame-600" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{file.label}</span>
                  <span className="block truncate text-[0.75rem] text-ink-muted">
                    {file.fileName} · {formatBytes(file.sizeBytes)}
                    {file.pageCount ? ` · ${file.pageCount} pages` : ""}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => remove(file)}
                  aria-label={`Remove ${file.label}`}
                  className="grid size-7 shrink-0 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[0.8125rem] text-ink-muted">No PDFs attached yet.</p>
        )}

        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Label for the next upload, e.g. Full paper"
            aria-label="File label"
          />
          <AdminButton tone="secondary" onClick={() => input.current?.click()} loading={busy}>
            <Upload className="size-4" aria-hidden />
            Attach PDF
          </AdminButton>
          <input
            ref={input}
            type="file"
            accept="application/pdf"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
            }}
          />
        </div>

        <p className="text-[0.75rem] text-ink-muted">
          Up to 50 MB. The text is extracted on upload so the paper is findable in site search.
        </p>
      </div>
    </Panel>
  );
}
