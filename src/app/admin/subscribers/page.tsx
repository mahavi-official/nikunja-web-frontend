"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import {
  AdminButton,
  AdminEmpty,
  AdminPagination,
  EmptyRow,
  ErrorNote,
  PageHeader,
  Spinner,
  TableShell,
  Td,
  Th,
  useToast,
} from "@/components/admin/ui";
import { RequirePermission } from "@/components/admin/AdminShell";
import { useAsync } from "@/components/admin/useAsync";
import { isAdmin, useApi, type Subscriber } from "@/lib/admin";
import { formatDate } from "@/lib/format";

/**
 * Newsletter list. Read-only by design — the API offers no way to add someone,
 * because a subscription has to be an act of the subscriber, and unsubscribing
 * happens through the one-click link in every send.
 */
export default function SubscribersPage() {
  return (
    <RequirePermission allow={isAdmin}>
      <Subscribers />
    </RequirePermission>
  );
}

function Subscribers() {
  const api = useApi();
  const { notify } = useToast();
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const { data, error, loading, reload } = useAsync(
    () => api.getPaged<{ subscribers: Subscriber[] }>("/admin/newsletter", { page, limit: 50 }),
    [page]
  );

  const exportCsv = async () => {
    setExporting(true);
    try {
      const token = await api.token();
      const response = await fetch(api.url("/admin/newsletter/export.csv"), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!response.ok) throw new Error(String(response.status));

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      notify("Could not download the export.", "error");
    } finally {
      setExporting(false);
    }
  };

  const subscribers = data?.data.subscribers ?? [];
  const active = subscribers.filter((subscriber) => subscriber.isActive).length;

  return (
    <>
      <PageHeader
        title="Subscribers"
        description="People who asked for the newsletter. Export the list to send from your mail provider."
        actions={
          <AdminButton tone="secondary" onClick={exportCsv} loading={exporting}>
            <Download className="size-4" aria-hidden />
            Export CSV
          </AdminButton>
        }
      />

      {error ? <ErrorNote error={error} onRetry={reload} /> : null}

      {loading && !data ? (
        <Spinner label="Loading subscribers" />
      ) : subscribers.length ? (
        <>
          <p className="mb-3 text-[0.8125rem] text-ink-muted">
            {active} active of {data?.meta.total ?? subscribers.length} on this list.
          </p>

          <TableShell>
            <thead>
              <tr>
                <Th>Email</Th>
                <Th className="w-32">Status</Th>
                <Th className="w-40">Subscribed</Th>
              </tr>
            </thead>
            <tbody>
              {subscribers.length === 0 ? (
                <EmptyRow colSpan={3}>No subscribers yet.</EmptyRow>
              ) : (
                subscribers.map((subscriber) => (
                  <tr key={subscriber.id} className="transition-colors hover:bg-surface-sunken/60">
                    <Td className="font-medium text-ink">{subscriber.email}</Td>
                    <Td>
                      {/* Not a StatusPill: "suspended" is the wrong word for
                          someone who simply used the unsubscribe link. */}
                      <span
                        className={
                          subscriber.isActive
                            ? "inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[0.6875rem] font-semibold tracking-wide text-emerald-700 uppercase dark:bg-emerald-950/50 dark:text-emerald-300"
                            : "inline-flex items-center rounded-md bg-sand-100 px-2 py-0.5 text-[0.6875rem] font-semibold tracking-wide text-sand-600 uppercase dark:bg-navy-900 dark:text-navy-200"
                        }
                      >
                        {subscriber.isActive ? "subscribed" : "unsubscribed"}
                      </span>
                    </Td>
                    <Td className="text-[0.8125rem] text-ink-muted tabular-nums">
                      {formatDate(subscriber.createdAt)}
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </TableShell>

          <AdminPagination
            page={data?.meta.page ?? 1}
            totalPages={data?.meta.totalPages ?? 1}
            total={data?.meta.total ?? 0}
            onPage={setPage}
          />
        </>
      ) : (
        <AdminEmpty
          title="No subscribers yet"
          description="The sign-up form is in the site footer."
        />
      )}
    </>
  );
}
