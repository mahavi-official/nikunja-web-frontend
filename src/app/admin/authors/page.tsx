"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
  Textarea,
  useConfirm,
  useToast,
} from "@/components/admin/ui";
import { ImageField } from "@/components/admin/MediaPicker";
import { RequirePermission } from "@/components/admin/AdminShell";
import { useAsync } from "@/components/admin/useAsync";
import { AdminApiError, canEditModule, useApi } from "@/lib/admin";
import { mediaUrl } from "@/lib/format";
import type { Author, Media } from "@/lib/types";

/**
 * Research authors.
 *
 * Distinct from user accounts on purpose: most people credited on a paper will
 * never sign in, and the ones who do should not have their byline coupled to
 * their login.
 */

interface AuthorDraft {
  name: string;
  slug: string;
  affiliation: string;
  bio: string;
  email: string;
  orcid: string;
  photo: Media | null;
}

const EMPTY: AuthorDraft = {
  name: "",
  slug: "",
  affiliation: "",
  bio: "",
  email: "",
  orcid: "",
  photo: null,
};

export default function AuthorsPage() {
  return (
    <RequirePermission allow={(viewer) => canEditModule(viewer, "research")}>
      <AuthorsList />
    </RequirePermission>
  );
}

function AuthorsList() {
  const api = useApi();
  const { notify } = useToast();
  const { confirm, dialog } = useConfirm();

  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Author | "new" | null>(null);
  const [draft, setDraft] = useState<AuthorDraft>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, error, loading, reload } = useAsync(
    () => api.getPaged<{ authors: Author[] }>("/admin/authors", { page, limit: 24 }),
    [page]
  );

  const open = (author: Author | "new") => {
    setFormError(null);
    setEditing(author);
    setDraft(
      author === "new"
        ? EMPTY
        : {
            name: author.name,
            slug: author.slug,
            affiliation: author.affiliation ?? "",
            bio: author.bio ?? "",
            email: author.email ?? "",
            orcid: author.orcid ?? "",
            photo: author.photo,
          }
    );
  };

  const save = async () => {
    if (!draft.name.trim()) {
      setFormError("A name is required.");
      return;
    }

    setSaving(true);
    setFormError(null);

    const optional = (value: string) => (value.trim() ? value.trim() : undefined);
    const payload = {
      name: draft.name.trim(),
      slug: optional(draft.slug),
      affiliation: optional(draft.affiliation),
      bio: optional(draft.bio),
      email: optional(draft.email),
      orcid: optional(draft.orcid),
      photoId: draft.photo?.id,
    };

    try {
      if (editing === "new") {
        await api.post("/admin/authors", payload);
        notify("Author added.");
      } else if (editing) {
        await api.patch(`/admin/authors/${editing.id}`, payload);
        notify("Author updated.");
      }
      setEditing(null);
      reload();
    } catch (cause) {
      setFormError(cause instanceof AdminApiError ? cause.message : "Could not save this author.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (author: Author) => {
    const confirmed = await confirm({
      title: `Delete ${author.name}?`,
      body: "Their byline is removed from every publication they are credited on. The publications themselves stay.",
    });
    if (!confirmed) return;

    try {
      await api.del(`/admin/authors/${author.id}`);
      notify("Author deleted.");
      reload();
    } catch (cause) {
      notify(cause instanceof AdminApiError ? cause.message : "Could not delete.", "error");
    }
  };

  const authors = data?.data.authors ?? [];

  return (
    <>
      <PageHeader
        title="Authors"
        description="People credited on publications. They do not need an account here."
        actions={
          <AdminButton onClick={() => open("new")}>
            <Plus className="size-4" aria-hidden />
            Add author
          </AdminButton>
        }
      />

      {error ? <ErrorNote error={error} onRetry={reload} /> : null}

      {loading && !data ? (
        <Spinner label="Loading authors" />
      ) : authors.length ? (
        <>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {authors.map((author) => {
              const photo = mediaUrl(author.photo, "thumb");
              return (
                <li
                  key={author.id}
                  className="group flex items-start gap-3 rounded-2xl border border-line bg-surface-raised p-4"
                >
                  <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-navy-50 text-sm font-semibold text-navy-700 dark:bg-navy-900 dark:text-navy-100">
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo} alt="" className="size-full object-cover" />
                    ) : (
                      author.name.charAt(0).toUpperCase()
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{author.name}</p>
                    {author.affiliation ? (
                      <p className="mt-0.5 truncate text-[0.75rem] text-ink-muted">
                        {author.affiliation}
                      </p>
                    ) : null}
                    {author.orcid ? (
                      <p className="mt-0.5 truncate font-mono text-[0.6875rem] text-ink-muted">
                        {author.orcid}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <button
                      type="button"
                      onClick={() => open(author)}
                      aria-label={`Edit ${author.name}`}
                      className="grid size-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(author)}
                      aria-label={`Delete ${author.name}`}
                      className="grid size-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
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
          title="No authors yet"
          description="Add the people you credit on publications, then pick them on each paper."
          action={<AdminButton onClick={() => open("new")}>Add the first author</AdminButton>}
        />
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Add author" : "Edit author"}
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

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" required>
              <Input
                autoFocus
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </Field>

            <Field label="Affiliation">
              <Input
                value={draft.affiliation}
                onChange={(event) => setDraft({ ...draft, affiliation: event.target.value })}
                placeholder="University or institute"
              />
            </Field>
          </div>

          {editing === "new" ? (
            <Field label="Slug" hint="Generated from the name if blank.">
              <Input
                value={draft.slug}
                onChange={(event) => setDraft({ ...draft, slug: event.target.value })}
                className="font-mono text-[0.8125rem]"
              />
            </Field>
          ) : null}

          <Field label="Biography" hint="Shown on the author's page.">
            <Textarea
              rows={4}
              value={draft.bio}
              onChange={(event) => setDraft({ ...draft, bio: event.target.value })}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" hint="Not shown publicly.">
              <Input
                type="email"
                value={draft.email}
                onChange={(event) => setDraft({ ...draft, email: event.target.value })}
              />
            </Field>

            <Field label="ORCID">
              <Input
                value={draft.orcid}
                onChange={(event) => setDraft({ ...draft, orcid: event.target.value })}
                placeholder="0000-0002-1825-0097"
                className="font-mono text-[0.8125rem]"
              />
            </Field>
          </div>

          <ImageField
            label="Photo"
            value={draft.photo}
            onChange={(media) => setDraft({ ...draft, photo: media })}
          />
        </div>
      </Modal>

      {dialog}
    </>
  );
}
