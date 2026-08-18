"use client";

import { useState } from "react";
import { Check, Download, Mail, Phone } from "lucide-react";
import {
  AdminButton,
  AdminEmpty,
  AdminPagination,
  ErrorNote,
  PageHeader,
  Select,
  Spinner,
  useToast,
} from "@/components/admin/ui";
import { RequirePermission } from "@/components/admin/AdminShell";
import { useAsync } from "@/components/admin/useAsync";
import { AdminApiError, isAdmin, useApi, type ContactMessage } from "@/lib/admin";
import { cn, formatDate } from "@/lib/format";

/** Contact-form submissions. Read/unread is the only state they carry. */
export default function MessagesPage() {
  return (
    <RequirePermission allow={isAdmin}>
      <Messages />
    </RequirePermission>
  );
}

function Messages() {
  const api = useApi();
  const { notify } = useToast();

  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("");
  const [exporting, setExporting] = useState(false);

  const { data, error, loading, reload } = useAsync(
    () =>
      api.getPaged<{ messages: ContactMessage[] }>("/admin/contact-messages", {
        page,
        limit: 20,
        isRead: filter === "" ? undefined : filter === "read",
      }),
    [page, filter]
  );

  const markRead = async (message: ContactMessage) => {
    try {
      await api.patch(`/admin/contact-messages/${message.id}/read`, {});
      reload();
    } catch (cause) {
      notify(cause instanceof AdminApiError ? cause.message : "Could not update.", "error");
    }
  };

  /**
   * The export is a guarded endpoint, so it cannot be a plain link — the
   * browser would send no Authorization header. Fetch it with the token, then
   * hand the blob to a synthetic download.
   */
  const exportCsv = async () => {
    setExporting(true);
    try {
      const token = await api.token();
      const response = await fetch(api.url("/admin/contact-messages/export.csv"), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!response.ok) throw new Error(String(response.status));

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `contact-messages-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      notify("Could not download the export.", "error");
    } finally {
      setExporting(false);
    }
  };

  const messages = data?.data.messages ?? [];

  return (
    <>
      <PageHeader
        title="Messages"
        description="Everything sent through the contact form."
        actions={
          <>
            <Select
              value={filter}
              aria-label="Filter messages"
              onChange={(event) => {
                setFilter(event.target.value);
                setPage(1);
              }}
              className="h-10"
            >
              <option value="">All messages</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </Select>
            <AdminButton tone="secondary" onClick={exportCsv} loading={exporting}>
              <Download className="size-4" aria-hidden />
              Export CSV
            </AdminButton>
          </>
        }
      />

      {error ? <ErrorNote error={error} onRetry={reload} /> : null}

      {loading && !data ? (
        <Spinner label="Loading messages" />
      ) : messages.length ? (
        <>
          <ul className="space-y-3">
            {messages.map((message) => (
              <li
                key={message.id}
                className={cn(
                  "rounded-2xl border bg-surface-raised p-5",
                  message.isRead ? "border-line" : "border-flame-200 bg-flame-50/40 dark:bg-flame-950/10"
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">
                      {message.subject || "No subject"}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] text-ink-muted">
                      <span className="font-medium text-ink-soft">{message.name}</span>
                      <a
                        href={`mailto:${message.email}`}
                        className="inline-flex items-center gap-1 transition-colors hover:text-flame-600"
                      >
                        <Mail className="size-3" aria-hidden />
                        {message.email}
                      </a>
                      {message.phone ? (
                        <a
                          href={`tel:${message.phone.replace(/\s+/g, "")}`}
                          className="inline-flex items-center gap-1 transition-colors hover:text-flame-600"
                        >
                          <Phone className="size-3" aria-hidden />
                          {message.phone}
                        </a>
                      ) : null}
                      <time dateTime={message.createdAt}>{formatDate(message.createdAt)}</time>
                    </p>
                  </div>

                  {!message.isRead ? (
                    <AdminButton tone="secondary" size="sm" onClick={() => markRead(message)}>
                      <Check className="size-3.5" aria-hidden />
                      Mark read
                    </AdminButton>
                  ) : null}
                </div>

                <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-ink-soft">
                  {message.message}
                </p>
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
          title={filter ? "Nothing matches this filter" : "No messages yet"}
          description="Submissions from the contact form arrive here."
        />
      )}
    </>
  );
}
