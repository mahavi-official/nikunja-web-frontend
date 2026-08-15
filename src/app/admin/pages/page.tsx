"use client";

import { useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import {
  AdminButton,
  ErrorNote,
  Field,
  InfoNote,
  Input,
  PageHeader,
  Panel,
  Spinner,
  Textarea,
  useToast,
} from "@/components/admin/ui";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { SeoPanel } from "@/components/admin/SeoPanel";
import { RequirePermission } from "@/components/admin/AdminShell";
import { useAsync } from "@/components/admin/useAsync";
import { AdminApiError, isStaff, useApi } from "@/lib/admin";
import type { AboutSections, Page } from "@/lib/types";

/**
 * The About page.
 *
 * `Page.sections` is a JSON blob, which means the API imposes no shape on it —
 * the frontend does, through `AboutSections`. This screen is therefore the
 * schema: it renders one control per field the About template actually reads,
 * so an editor cannot save a key the page will ignore.
 */

interface AboutDraft extends AboutSections {
  title: string;
  metaTitle: string;
  metaDescription: string;
  noIndex: boolean;
}

const EMPTY: AboutDraft = {
  title: "About",
  about: "",
  mission: "",
  vision: "",
  objectives: [],
  team: [],
  journey: [],
  contact: "",
  metaTitle: "",
  metaDescription: "",
  noIndex: false,
};

export default function PagesScreen() {
  return (
    <RequirePermission allow={isStaff}>
      <AboutEditor />
    </RequirePermission>
  );
}

function AboutEditor() {
  const api = useApi();
  const { notify } = useToast();

  const { data, error, loading, reload } = useAsync(
    // A page that has never been saved 404s; that is a valid starting state,
    // not a failure, so it resolves to null and the form opens empty.
    () =>
      api
        .get<Page<AboutSections> & { metaTitle?: string; metaDescription?: string }>(
          "/admin/pages/about"
        )
        .catch((cause) => {
          if (cause instanceof AdminApiError && cause.status === 404) return null;
          throw cause;
        }),
    []
  );

  const [draft, setDraft] = useState<AboutDraft>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    const sections = data.sections ?? {};
    setDraft({
      title: data.title ?? "About",
      about: sections.about ?? "",
      mission: sections.mission ?? "",
      vision: sections.vision ?? "",
      objectives: sections.objectives ?? [],
      team: sections.team ?? [],
      journey: sections.journey ?? [],
      contact: sections.contact ?? "",
      metaTitle: data.metaTitle ?? "",
      metaDescription: data.metaDescription ?? "",
      noIndex: data.noIndex ?? false,
    });
  }, [data]);

  const set = <K extends keyof AboutDraft>(key: K, value: AboutDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      await api.patch("/admin/pages/about", {
        title: draft.title.trim() || "About",
        sections: {
          about: draft.about,
          mission: draft.mission,
          vision: draft.vision,
          objectives: (draft.objectives ?? []).filter((item) => item.trim()),
          team: (draft.team ?? []).filter((member) => member.name.trim()),
          journey: (draft.journey ?? []).filter((entry) => entry.title?.trim() || entry.year?.trim()),
          contact: draft.contact,
        },
        metaTitle: draft.metaTitle.trim() || undefined,
        metaDescription: draft.metaDescription.trim() || undefined,
        noIndex: draft.noIndex,
      });
      notify("About page saved.");
      reload();
    } catch (cause) {
      notify(cause instanceof AdminApiError ? cause.message : "Could not save.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data) return <Spinner label="Loading the About page" />;
  if (error) return <ErrorNote error={error} onRetry={reload} />;

  return (
    <>
      <PageHeader
        title="Pages"
        description="Standing content that is not an article. About is the only one today."
        actions={
          <AdminButton onClick={save} loading={saving}>
            <Save className="size-4" aria-hidden />
            Save page
          </AdminButton>
        }
      />

      {!data ? (
        <div className="mb-5">
          <InfoNote>
            The About page has not been created yet. Fill in what you have and save — every section
            is optional, and empty ones are skipped when the page renders.
          </InfoNote>
        </div>
      ) : null}

      <div className="space-y-5">
        <Panel title="Heading">
          <Field label="Page title">
            <Input value={draft.title} onChange={(event) => set("title", event.target.value)} />
          </Field>
        </Panel>

        <Panel title="About" description="The opening statement. Rich text.">
          <RichTextEditor
            value={draft.about ?? ""}
            onChange={(html) => set("about", html)}
            placeholder="Who this organisation is and what it holds…"
            minHeight="16rem"
          />
        </Panel>

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Mission">
            <Textarea
              rows={5}
              value={draft.mission ?? ""}
              onChange={(event) => set("mission", event.target.value)}
              placeholder="What the work sets out to do."
            />
          </Panel>

          <Panel title="Vision">
            <Textarea
              rows={5}
              value={draft.vision ?? ""}
              onChange={(event) => set("vision", event.target.value)}
              placeholder="What success would look like."
            />
          </Panel>
        </div>

        <RepeaterPanel
          title="Objectives"
          description="Listed as bullets on the page."
          items={draft.objectives ?? []}
          onChange={(next) => set("objectives", next)}
          create={() => ""}
          render={(value, update) => (
            <Input
              value={value}
              onChange={(event) => update(event.target.value)}
              placeholder="An objective"
            />
          )}
        />

        <RepeaterPanel
          title="Team"
          description="People shown with their role."
          items={draft.team ?? []}
          onChange={(next) => set("team", next)}
          create={() => ({ name: "", role: "", bio: "" })}
          render={(member, update) => (
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                value={member.name}
                onChange={(event) => update({ ...member, name: event.target.value })}
                placeholder="Name"
                aria-label="Team member name"
              />
              <Input
                value={member.role ?? ""}
                onChange={(event) => update({ ...member, role: event.target.value })}
                placeholder="Role"
                aria-label="Team member role"
              />
              <Textarea
                rows={2}
                value={member.bio ?? ""}
                onChange={(event) => update({ ...member, bio: event.target.value })}
                placeholder="Short biography"
                aria-label="Team member biography"
                className="sm:col-span-2"
              />
            </div>
          )}
        />

        <RepeaterPanel
          title="Journey"
          description="A dated timeline, oldest first."
          items={draft.journey ?? []}
          onChange={(next) => set("journey", next)}
          create={() => ({ year: "", title: "", description: "" })}
          render={(entry, update) => (
            <div className="grid gap-2 sm:grid-cols-[6rem_1fr]">
              <Input
                value={entry.year ?? ""}
                onChange={(event) => update({ ...entry, year: event.target.value })}
                placeholder="2019"
                aria-label="Year"
              />
              <Input
                value={entry.title ?? ""}
                onChange={(event) => update({ ...entry, title: event.target.value })}
                placeholder="What happened"
                aria-label="Milestone title"
              />
              <Textarea
                rows={2}
                value={entry.description ?? ""}
                onChange={(event) => update({ ...entry, description: event.target.value })}
                placeholder="A sentence of detail"
                aria-label="Milestone description"
                className="sm:col-span-2"
              />
            </div>
          )}
        />

        <Panel title="Contact note" description="A short paragraph above the contact details.">
          <Textarea
            rows={3}
            value={draft.contact ?? ""}
            onChange={(event) => set("contact", event.target.value)}
          />
        </Panel>

        <SeoPanel
          metaTitle={draft.metaTitle}
          metaDescription={draft.metaDescription}
          noIndex={draft.noIndex}
          fallbackTitle={draft.title}
          fallbackDescription={draft.about ?? ""}
          path="/about"
          showKeywords={false}
          showCanonical={false}
          showOgImage={false}
          onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
        />

        <div className="flex justify-end">
          <AdminButton onClick={save} loading={saving}>
            <Save className="size-4" aria-hidden />
            Save page
          </AdminButton>
        </div>
      </div>
    </>
  );
}

/**
 * An add/remove/reorder list of anything. The About page has three of these
 * with different item shapes, so the row's contents are supplied by the caller
 * and this owns only the list mechanics.
 */
function RepeaterPanel<T>({
  title,
  description,
  items,
  onChange,
  create,
  render,
}: {
  title: string;
  description?: string;
  items: T[];
  onChange: (next: T[]) => void;
  create: () => T;
  render: (item: T, update: (next: T) => void) => React.ReactNode;
}) {
  const update = (index: number, next: T) =>
    onChange(items.map((item, itemIndex) => (itemIndex === index ? next : item)));

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <Panel
      title={title}
      description={description}
      actions={
        <AdminButton tone="secondary" size="sm" onClick={() => onChange([...items, create()])}>
          <Plus className="size-3.5" aria-hidden />
          Add
        </AdminButton>
      }
    >
      {items.length ? (
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li key={index} className="flex items-start gap-3">
              <span className="flex shrink-0 flex-col pt-2 text-ink-muted">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label="Move up"
                  className="leading-none disabled:opacity-30"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === items.length - 1}
                  aria-label="Move down"
                  className="leading-none disabled:opacity-30"
                >
                  ▼
                </button>
              </span>

              <div className="min-w-0 flex-1">{render(item, (next) => update(index, next))}</div>

              <button
                type="button"
                onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
                aria-label="Remove"
                className="mt-1 grid size-8 shrink-0 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[0.8125rem] text-ink-muted">
          Nothing here. This section is skipped when the page renders.
        </p>
      )}
    </Panel>
  );
}
