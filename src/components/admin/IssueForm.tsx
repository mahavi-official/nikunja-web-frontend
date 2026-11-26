"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ExternalLink, FlaskConical, Save, Send, Trash2 } from "lucide-react";
import {
  AdminButton,
  ErrorNote,
  Field,
  InfoNote,
  Input,
  Panel,
  StatusPill,
  Textarea,
  useConfirm,
  useToast,
} from "./ui";
import { ImageField } from "./MediaPicker";
import { RichTextEditor } from "./RichTextEditor";
import { SeoPanel } from "./SeoPanel";
import { useAsync } from "./useAsync";
import { useAuth } from "@/components/providers/AuthProvider";
import { AdminApiError, isAdmin, useApi, type Subscriber } from "@/lib/admin";
import { cn, formatDate } from "@/lib/format";
import type { Media, NewsletterIssue, NewsletterSendStatus } from "@/lib/types";

/**
 * The newsletter editor, shared by "new" and "edit".
 *
 * Writing an issue and mailing it are deliberately separate steps, the way
 * Substack separates "Continue" from "Send": Save keeps a draft, Publish puts
 * it on the website, and only the Send panel — admins only, behind a
 * confirmation — emails subscribers. A test copy to yourself is one click.
 */

export interface IssueDraft {
  title: string;
  subtitle: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: Media | null;
  metaTitle: string;
  metaDescription: string;
  noIndex: boolean;
}

export function emptyIssueDraft(): IssueDraft {
  return {
    title: "",
    subtitle: "",
    slug: "",
    excerpt: "",
    content: "",
    coverImage: null,
    metaTitle: "",
    metaDescription: "",
    noIndex: false,
  };
}

export function draftFromIssue(issue: NewsletterIssue): IssueDraft {
  return {
    title: issue.title,
    subtitle: issue.subtitle ?? "",
    slug: issue.slug,
    excerpt: issue.excerpt ?? "",
    content: issue.content ?? "",
    coverImage: issue.coverImage,
    metaTitle: issue.metaTitle ?? "",
    metaDescription: issue.metaDescription ?? "",
    noIndex: issue.noIndex,
  };
}

function toPayload(draft: IssueDraft, editing: boolean) {
  // On create an empty optional is simply left out; on edit it is sent as
  // null so clearing a field actually clears it.
  const optional = (value: string) => (value.trim() ? value.trim() : editing ? null : undefined);

  return {
    title: draft.title.trim(),
    subtitle: optional(draft.subtitle),
    slug: draft.slug.trim() || undefined,
    excerpt: optional(draft.excerpt),
    content: draft.content,
    coverImageId: draft.coverImage?.id ?? (editing ? null : undefined),
    metaTitle: optional(draft.metaTitle),
    metaDescription: optional(draft.metaDescription),
    noIndex: draft.noIndex,
  };
}

const SEND_LABEL: Record<NewsletterSendStatus, string> = {
  NOT_SENT: "Not sent yet",
  SENDING: "Sending…",
  SENT: "Sent",
  FAILED: "Stopped before finishing",
};

export function IssueForm({
  issue,
  onChanged,
}: {
  /** Absent when creating. */
  issue?: NewsletterIssue;
  /** Called with the fresh record after any change on the server. */
  onChanged?: (issue: NewsletterIssue) => void;
}) {
  const api = useApi();
  const router = useRouter();
  const { notify } = useToast();
  const { confirm, dialog } = useConfirm();

  const [saved, setSaved] = useState(() => (issue ? draftFromIssue(issue) : emptyIssueDraft()));
  const [draft, setDraft] = useState(saved);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const set = <K extends keyof IssueDraft>(key: K, value: IssueDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const sending = issue?.sendStatus === "SENDING";

  const fail = (cause: unknown, fallback: string) => {
    if (cause instanceof AdminApiError) {
      setFieldErrors(cause.fieldErrors);
      setFormError(cause.message);
    } else {
      setFormError(fallback);
    }
  };

  const save = async (thenPublish = false) => {
    setSaving(true);
    setFieldErrors({});
    setFormError(null);

    try {
      if (!draft.title.trim()) throw new AdminApiError(400, "VALIDATION_FAILED", "A title is required.");
      if (!draft.content.replace(/<[^>]+>/g, "").trim()) {
        throw new AdminApiError(400, "VALIDATION_FAILED", "The issue has no body yet.");
      }

      let result = issue
        ? await api.patch<NewsletterIssue>(`/admin/newsletter/issues/${issue.id}`, toPayload(draft, true))
        : await api.post<NewsletterIssue>("/admin/newsletter/issues", toPayload(draft, false));

      if (thenPublish) {
        result = await api.post<NewsletterIssue>(`/admin/newsletter/issues/${result.id}/publish`);
      }

      notify(thenPublish ? "Issue published on the website." : "Issue saved.");

      if (!issue) {
        router.replace(`/admin/newsletter/${result.id}`);
      } else {
        const next = draftFromIssue(result);
        setSaved(next);
        setDraft(next);
        onChanged?.(result);
      }
    } catch (cause) {
      fail(cause, "Something went wrong saving this issue.");
    } finally {
      setSaving(false);
    }
  };

  const unpublish = async () => {
    if (!issue) return;
    try {
      onChanged?.(await api.post<NewsletterIssue>(`/admin/newsletter/issues/${issue.id}/unpublish`));
      notify("Issue taken off the website.");
    } catch (cause) {
      notify(cause instanceof AdminApiError ? cause.message : "Could not unpublish.", "error");
    }
  };

  const remove = async () => {
    if (!issue) return;
    const ok = await confirm({
      title: "Delete this issue?",
      body: `“${draft.title}” will be removed from the website and the archive. Emails already sent stay in people's inboxes. This cannot be undone.`,
    });
    if (!ok) return;

    try {
      await api.del(`/admin/newsletter/issues/${issue.id}`);
      notify("Issue deleted.");
      router.push("/admin/newsletter");
    } catch (cause) {
      notify(cause instanceof AdminApiError ? cause.message : "Could not delete.", "error");
    }
  };

  const publicPath = `/newsletter/${draft.slug}`;

  return (
    <>
      {formError ? (
        <div className="mb-4">
          <ErrorNote error={formError} />
        </div>
      ) : null}

      {sending ? (
        <div className="mb-4">
          <InfoNote>This issue is being emailed right now. Editing is locked until the send finishes.</InfoNote>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* ── the writing ── */}
        <div className="space-y-5 lg:col-span-2">
          <Panel>
            <fieldset disabled={sending} className="space-y-4">
              <Field label="Title" required error={fieldErrors.title} htmlFor="issue-title" hint="Also the email subject line.">
                <Input
                  id="issue-title"
                  value={draft.title}
                  onChange={(event) => set("title", event.target.value)}
                  placeholder="What is this issue called?"
                  className="text-base"
                />
              </Field>

              <Field
                label="Subtitle"
                hint="One line under the title. Inboxes show it as the preview text."
                error={fieldErrors.subtitle}
                htmlFor="issue-subtitle"
              >
                <Input
                  id="issue-subtitle"
                  value={draft.subtitle}
                  onChange={(event) => set("subtitle", event.target.value)}
                />
              </Field>

              <Field
                label="Slug"
                hint={
                  issue
                    ? "Changing this on a published issue leaves a permanent redirect from the old address."
                    : "Leave blank to generate one from the title."
                }
                error={fieldErrors.slug}
                htmlFor="issue-slug"
              >
                <Input
                  id="issue-slug"
                  value={draft.slug}
                  onChange={(event) => set("slug", event.target.value)}
                  placeholder="auto-generated-from-title"
                  className="font-mono text-[0.8125rem]"
                />
              </Field>

              <Field
                label="Archive summary"
                hint="Shown in the archive when there is no subtitle. Generated from the body if left blank."
                error={fieldErrors.excerpt}
                htmlFor="issue-excerpt"
              >
                <Textarea
                  id="issue-excerpt"
                  rows={2}
                  value={draft.excerpt}
                  onChange={(event) => set("excerpt", event.target.value)}
                />
              </Field>
            </fieldset>
          </Panel>

          <Panel title="Body" description="What subscribers read in their inbox and on the website.">
            <RichTextEditor value={draft.content} onChange={(html) => set("content", html)} />
            {fieldErrors.content ? (
              <p className="mt-2 text-[0.8125rem] text-red-600">{fieldErrors.content}</p>
            ) : null}
          </Panel>

          <SeoPanel
            metaTitle={draft.metaTitle}
            metaDescription={draft.metaDescription}
            noIndex={draft.noIndex}
            fallbackTitle={draft.title}
            fallbackDescription={draft.subtitle || draft.excerpt || draft.content}
            path={publicPath}
            showKeywords={false}
            showCanonical={false}
            showOgImage={false}
            onChange={(patch) =>
              setDraft((current) => ({
                ...current,
                ...(patch.metaTitle !== undefined && { metaTitle: patch.metaTitle }),
                ...(patch.metaDescription !== undefined && { metaDescription: patch.metaDescription }),
                ...(patch.noIndex !== undefined && { noIndex: patch.noIndex }),
              }))
            }
          />
        </div>

        {/* ── the settings ── */}
        <div className="space-y-5">
          <Panel title="Website">
            <div className="space-y-4">
              {issue ? (
                <div className="flex items-center justify-between">
                  <span className="text-[0.8125rem] text-ink-muted">Status</span>
                  <StatusPill status={issue.status} />
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <AdminButton onClick={() => save(false)} loading={saving} disabled={sending} className="flex-1">
                  <Save className="size-4" aria-hidden />
                  Save
                </AdminButton>

                {issue?.status === "PUBLISHED" ? (
                  <AdminButton tone="secondary" onClick={unpublish} disabled={saving || sending}>
                    Unpublish
                  </AdminButton>
                ) : (
                  <AdminButton tone="secondary" onClick={() => save(true)} disabled={saving || sending}>
                    Save &amp; publish
                  </AdminButton>
                )}
              </div>

              <p className="text-[0.8125rem] text-ink-muted">
                Publishing puts the issue in the archive at /newsletter. It does not email anyone.
              </p>

              {issue?.status === "PUBLISHED" ? (
                <a
                  href={`/newsletter/${issue.slug}`}
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

          {issue ? <SendPanel issue={issue} dirty={dirty} onChanged={onChanged} /> : (
            <Panel title="Email">
              <p className="text-[0.8125rem] text-ink-muted">Save the issue first, then you can send yourself a test or email it to subscribers.</p>
            </Panel>
          )}

          <Panel title="Cover image">
            <ImageField
              label=""
              hint="Shown at the top of the email and the issue page, and in the archive."
              value={draft.coverImage}
              onChange={(media) => set("coverImage", media)}
            />
          </Panel>

          {issue ? (
            <Panel title="Danger zone">
              <AdminButton tone="danger" onClick={remove} disabled={sending} className="w-full">
                <Trash2 className="size-4" aria-hidden />
                Delete this issue
              </AdminButton>
            </Panel>
          ) : null}
        </div>
      </div>

      {dialog}
    </>
  );
}

/* ── sending ───────────────────────────────────────────────── */

function SendPanel({
  issue,
  dirty,
  onChanged,
}: {
  issue: NewsletterIssue;
  dirty: boolean;
  onChanged?: (issue: NewsletterIssue) => void;
}) {
  const api = useApi();
  const { user } = useAuth();
  const { notify } = useToast();
  const { confirm, dialog } = useConfirm();
  const [testing, setTesting] = useState(false);
  const [starting, setStarting] = useState(false);

  const canSend = isAdmin(user);

  // Only admins can read the subscriber list, so only they see the count.
  const audience = useAsync(
    async () =>
      canSend ? (await api.getPaged<{ subscribers: Subscriber[] }>("/admin/newsletter", { limit: 1 })).meta.total : null,
    [canSend]
  );

  // While a send runs on the server, poll the issue for progress.
  useEffect(() => {
    if (issue.sendStatus !== "SENDING") return;
    const timer = setInterval(async () => {
      try {
        onChanged?.(await api.get<NewsletterIssue>(`/admin/newsletter/issues/${issue.id}`));
      } catch {
        /* the next tick will try again */
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [api, issue.id, issue.sendStatus, onChanged]);

  const sendTest = async () => {
    setTesting(true);
    try {
      const result = await api.post<{ message: string }>(`/admin/newsletter/issues/${issue.id}/test`, {});
      notify(result.message);
    } catch (cause) {
      notify(cause instanceof AdminApiError ? cause.message : "Could not send the test.", "error");
    } finally {
      setTesting(false);
    }
  };

  const retry = issue.sendStatus === "FAILED" || (issue.sendStatus === "SENT" && issue.failedCount > 0);
  const recipients = audience.data;

  const send = async () => {
    const who = recipients != null ? `${recipients} subscriber${recipients === 1 ? "" : "s"}` : "every subscriber";
    const ok = await confirm({
      title: retry ? "Resume sending?" : "Email this issue?",
      body: retry
        ? `The issue will be emailed to subscribers who have not received it yet. Nobody gets it twice.`
        : `“${issue.title}” will be emailed to ${who}${issue.status === "PUBLISHED" ? "" : " and published on the website"}. This cannot be undone.`,
      confirmLabel: retry ? "Resume sending" : "Send now",
    });
    if (!ok) return;

    setStarting(true);
    try {
      onChanged?.(await api.post<NewsletterIssue>(`/admin/newsletter/issues/${issue.id}/send`));
      notify("Sending has started. You can leave this page; it carries on in the background.");
    } catch (cause) {
      notify(cause instanceof AdminApiError ? cause.message : "Could not start sending.", "error");
    } finally {
      setStarting(false);
    }
  };

  const progress =
    issue.recipientCount > 0 ? Math.min(100, Math.round((issue.sentCount / issue.recipientCount) * 100)) : 0;

  return (
    <Panel title="Email">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[0.8125rem] text-ink-muted">Delivery</span>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-[0.8125rem] font-medium",
              issue.sendStatus === "SENT" && "text-emerald-700 dark:text-emerald-300",
              issue.sendStatus === "FAILED" && "text-red-600",
              issue.sendStatus === "SENDING" && "text-flame-600"
            )}
          >
            {issue.sendStatus === "SENT" ? <CheckCircle2 className="size-3.5" aria-hidden /> : null}
            {SEND_LABEL[issue.sendStatus]}
          </span>
        </div>

        {issue.sendStatus !== "NOT_SENT" ? (
          <div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-sunken" aria-hidden>
              <div className="h-full bg-flame-500 transition-[width]" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-[0.8125rem] text-ink-muted tabular-nums">
              {issue.sentCount} of {issue.recipientCount} delivered
              {issue.failedCount ? ` · ${issue.failedCount} failed` : ""}
              {issue.sentAt && issue.sendStatus === "SENT" ? ` · ${formatDate(issue.sentAt)}` : ""}
            </p>
          </div>
        ) : null}

        {dirty ? (
          <p className="text-[0.8125rem] text-flame-700 dark:text-flame-300">
            You have unsaved changes. Save first — emails use the saved version.
          </p>
        ) : null}

        <AdminButton
          tone="secondary"
          onClick={sendTest}
          loading={testing}
          disabled={dirty}
          className="w-full"
        >
          <FlaskConical className="size-4" aria-hidden />
          Send a test to myself
        </AdminButton>

        {canSend ? (
          issue.sendStatus === "SENT" && !retry ? null : (
            <AdminButton
              onClick={send}
              loading={starting}
              disabled={dirty || issue.sendStatus === "SENDING" || recipients === 0}
              className="w-full"
            >
              <Send className="size-4" aria-hidden />
              {retry
                ? "Resume sending"
                : recipients != null
                  ? `Send to ${recipients} subscriber${recipients === 1 ? "" : "s"}`
                  : "Send to subscribers"}
            </AdminButton>
          )
        ) : (
          <p className="text-[0.8125rem] text-ink-muted">An administrator sends the issue to subscribers.</p>
        )}

        {canSend && recipients === 0 ? (
          <p className="text-[0.8125rem] text-ink-muted">Nobody has subscribed yet.</p>
        ) : null}
      </div>
      {dialog}
    </Panel>
  );
}
