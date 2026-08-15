"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  AdminButton,
  AdminEmpty,
  ErrorNote,
  Field,
  Input,
  Modal,
  PageHeader,
  Panel,
  Select,
  Spinner,
  Textarea,
  useConfirm,
  useToast,
} from "@/components/admin/ui";
import { RequirePermission } from "@/components/admin/AdminShell";
import { useAsync } from "@/components/admin/useAsync";
import { AdminApiError, canEditModule, useApi } from "@/lib/admin";
import { cn } from "@/lib/format";
import type { Category, CategoryScope, Tag, VideoCategory } from "@/lib/types";

/**
 * Categories, tags, and video categories on one screen.
 *
 * They are three tables in the database but one job to an editor — "the words
 * we file things under" — and each is too small to justify its own screen in
 * the rail.
 */

const SCOPES: { value: CategoryScope; label: string }[] = [
  { value: "ARTICLE", label: "Articles" },
  { value: "BLOG", label: "Blogs" },
  { value: "RESEARCH", label: "Research" },
];

type TabKey = "categories" | "tags" | "videos";

export default function TaxonomyPage() {
  const [tab, setTab] = useState<TabKey>("categories");

  const TABS: { key: TabKey; label: string }[] = [
    { key: "categories", label: "Categories" },
    { key: "tags", label: "Tags" },
    { key: "videos", label: "Video categories" },
  ];

  return (
    <RequirePermission allow={(viewer) => canEditModule(viewer, "posts")}>
      <PageHeader
        title="Categories & tags"
        description="How content is filed. Categories are curated and scoped; tags are free-form and shared across everything."
      />

      <div
        role="tablist"
        aria-label="Taxonomy type"
        className="mb-5 inline-flex rounded-xl border border-line bg-surface-raised p-1"
      >
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
            className={cn(
              "rounded-lg px-3.5 py-1.5 text-[0.8125rem] font-medium transition-colors",
              tab === item.key
                ? "bg-navy-900 text-white dark:bg-navy-600"
                : "text-ink-soft hover:text-ink"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "categories" ? <Categories /> : null}
      {tab === "tags" ? <Tags /> : null}
      {tab === "videos" ? <VideoCategories /> : null}
    </RequirePermission>
  );
}

/* ── categories ────────────────────────────────────────────── */

function Categories() {
  const api = useApi();
  const { notify } = useToast();
  const { confirm, dialog } = useConfirm();

  const [scope, setScope] = useState<CategoryScope>("ARTICLE");
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", description: "" });
  const [saving, setSaving] = useState(false);

  const { data, error, loading, reload } = useAsync(
    () => api.getPaged<{ categories: Category[] }>("/admin/categories", { scope, limit: 100 }),
    [scope]
  );

  const open = (category: Category | "new") => {
    setEditing(category);
    setForm(
      category === "new"
        ? { name: "", slug: "", description: "" }
        : {
            name: category.name,
            slug: category.slug,
            description: category.description ?? "",
          }
    );
  };

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);

    try {
      if (editing === "new") {
        await api.post("/admin/categories", {
          scope,
          name: form.name.trim(),
          slug: form.slug.trim() || undefined,
          description: form.description.trim() || undefined,
        });
        notify("Category created.");
      } else if (editing) {
        // The API does not accept a scope or slug change on update — a
        // category's URL is stable once anything is filed under it.
        await api.patch(`/admin/categories/${editing.id}`, {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
        });
        notify("Category updated.");
      }
      setEditing(null);
      reload();
    } catch (cause) {
      notify(cause instanceof AdminApiError ? cause.message : "Could not save.", "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (category: Category) => {
    const confirmed = await confirm({
      title: `Delete “${category.name}”?`,
      body: "Anything filed under it stays published but loses this category.",
    });
    if (!confirmed) return;

    try {
      await api.del(`/admin/categories/${category.id}`);
      notify("Category deleted.");
      reload();
    } catch (cause) {
      notify(cause instanceof AdminApiError ? cause.message : "Could not delete.", "error");
    }
  };

  const categories = data?.data.categories ?? [];

  return (
    <>
      <Panel
        title="Categories"
        description="Scoped: an article category is not offered on a research paper."
        actions={
          <>
            <Select
              value={scope}
              aria-label="Category scope"
              onChange={(event) => setScope(event.target.value as CategoryScope)}
              className="h-8 py-0 text-[0.8125rem]"
            >
              {SCOPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
            <AdminButton size="sm" onClick={() => open("new")}>
              <Plus className="size-3.5" aria-hidden />
              Add
            </AdminButton>
          </>
        }
        bodyClassName="p-0"
      >
        {error ? (
          <div className="p-5">
            <ErrorNote error={error} onRetry={reload} />
          </div>
        ) : loading && !data ? (
          <Spinner />
        ) : categories.length ? (
          <ul className="divide-y divide-[var(--border-subtle)]">
            {categories.map((category) => (
              <li key={category.id} className="flex items-center gap-4 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{category.name}</p>
                  <p className="mt-0.5 truncate text-[0.75rem] text-ink-muted">
                    /{category.slug}
                    {category.description ? ` · ${category.description}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => open(category)}
                  aria-label={`Edit ${category.name}`}
                  className="grid size-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(category)}
                  aria-label={`Delete ${category.name}`}
                  className="grid size-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-5">
            <AdminEmpty
              title="No categories in this scope"
              description="Add one and it becomes available on the matching content type."
            />
          </div>
        )}
      </Panel>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "New category" : "Edit category"}
        size="sm"
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
          <Field label="Name" required>
            <Input
              autoFocus
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </Field>

          {editing === "new" ? (
            <Field label="Slug" hint="Leave blank to generate it from the name.">
              <Input
                value={form.slug}
                onChange={(event) => setForm({ ...form, slug: event.target.value })}
                className="font-mono text-[0.8125rem]"
              />
            </Field>
          ) : null}

          <Field label="Description" hint="Shown on the category's listing page.">
            <Textarea
              rows={3}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </Field>
        </div>
      </Modal>

      {dialog}
    </>
  );
}

/* ── tags ──────────────────────────────────────────────────── */

function Tags() {
  const api = useApi();
  const { notify } = useToast();
  const { confirm, dialog } = useConfirm();

  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const { data, error, loading, reload } = useAsync(
    () => api.getPaged<{ tags: Tag[] }>("/admin/tags", { limit: 100 }),
    []
  );

  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await api.post("/admin/tags", { name: name.trim() });
      setName("");
      notify("Tag created.");
      reload();
    } catch (cause) {
      notify(cause instanceof AdminApiError ? cause.message : "Could not create.", "error");
    } finally {
      setBusy(false);
    }
  };

  const rename = async (tag: Tag) => {
    const next = window.prompt("Rename tag", tag.name);
    if (!next || next === tag.name) return;
    try {
      await api.patch(`/admin/tags/${tag.id}`, { name: next.trim() });
      notify("Tag renamed.");
      reload();
    } catch (cause) {
      notify(cause instanceof AdminApiError ? cause.message : "Could not rename.", "error");
    }
  };

  const remove = async (tag: Tag) => {
    const confirmed = await confirm({
      title: `Delete “${tag.name}”?`,
      body: "It is removed from everything tagged with it. Nothing is unpublished.",
    });
    if (!confirmed) return;

    try {
      await api.del(`/admin/tags/${tag.id}`);
      notify("Tag deleted.");
      reload();
    } catch (cause) {
      notify(cause instanceof AdminApiError ? cause.message : "Could not delete.", "error");
    }
  };

  const tags = data?.data.tags ?? [];

  return (
    <>
      <Panel
        title="Tags"
        description="Shared by posts and research. Writers also create these by typing them into an editor."
      >
        <div className="mb-5 flex gap-2">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && create()}
            placeholder="New tag name"
            aria-label="New tag name"
          />
          <AdminButton onClick={create} loading={busy}>
            <Plus className="size-4" aria-hidden />
            Add
          </AdminButton>
        </div>

        {error ? (
          <ErrorNote error={error} onRetry={reload} />
        ) : loading && !data ? (
          <Spinner />
        ) : tags.length ? (
          <ul className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <li
                key={tag.id}
                className="group inline-flex items-center gap-1 rounded-lg border border-line bg-surface py-1 pr-1 pl-3 text-[0.8125rem]"
              >
                <button
                  type="button"
                  onClick={() => rename(tag)}
                  title="Rename"
                  className="font-medium text-ink transition-colors hover:text-flame-600"
                >
                  {tag.name}
                </button>
                <button
                  type="button"
                  onClick={() => remove(tag)}
                  aria-label={`Delete ${tag.name}`}
                  className="grid size-6 place-items-center rounded text-ink-muted transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="size-3" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <AdminEmpty title="No tags yet" description="Add one above, or type one into a post." />
        )}
      </Panel>

      {dialog}
    </>
  );
}

/* ── video categories ──────────────────────────────────────── */

function VideoCategories() {
  const api = useApi();
  const { notify } = useToast();
  const { confirm, dialog } = useConfirm();

  const [form, setForm] = useState({ name: "", description: "" });
  const [busy, setBusy] = useState(false);

  const { data, error, loading, reload } = useAsync(
    () => api.get<{ categories: VideoCategory[] }>("/admin/video-categories"),
    []
  );

  const create = async () => {
    if (!form.name.trim()) return;
    setBusy(true);
    try {
      await api.post("/admin/video-categories", {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
      });
      setForm({ name: "", description: "" });
      notify("Video category created.");
      reload();
    } catch (cause) {
      notify(cause instanceof AdminApiError ? cause.message : "Could not create.", "error");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (category: VideoCategory) => {
    const confirmed = await confirm({
      title: `Delete “${category.name}”?`,
      body: "Videos in it stay published but become uncategorised.",
    });
    if (!confirmed) return;

    try {
      await api.del(`/admin/video-categories/${category.id}`);
      notify("Video category deleted.");
      reload();
    } catch (cause) {
      notify(cause instanceof AdminApiError ? cause.message : "Could not delete.", "error");
    }
  };

  const categories = data?.categories ?? [];

  return (
    <>
      <Panel
        title="Video categories"
        description="A separate taxonomy from posts — the video section files its own way."
      >
        <div className="mb-5 grid gap-2 sm:grid-cols-[1fr_1.5fr_auto]">
          <Input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="Name"
            aria-label="Video category name"
          />
          <Input
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            placeholder="Description (optional)"
            aria-label="Video category description"
          />
          <AdminButton onClick={create} loading={busy}>
            <Plus className="size-4" aria-hidden />
            Add
          </AdminButton>
        </div>

        {error ? (
          <ErrorNote error={error} onRetry={reload} />
        ) : loading && !data ? (
          <Spinner />
        ) : categories.length ? (
          <ul className="divide-y divide-[var(--border-subtle)]">
            {categories.map((category) => (
              <li key={category.id} className="flex items-center gap-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{category.name}</p>
                  <p className="mt-0.5 truncate text-[0.75rem] text-ink-muted">
                    /{category.slug}
                    {category.description ? ` · ${category.description}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(category)}
                  aria-label={`Delete ${category.name}`}
                  className="grid size-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <AdminEmpty title="No video categories yet" />
        )}
      </Panel>

      {dialog}
    </>
  );
}
