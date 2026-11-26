"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Plus, Search } from "lucide-react";
import {
  AdminLinkButton,
  AdminPagination,
  EmptyRow,
  ErrorNote,
  Input,
  PageHeader,
  Select,
  Spinner,
  StatusPill,
  TableShell,
  Td,
  Th,
} from "@/components/admin/ui";
import { RequirePermission } from "@/components/admin/AdminShell";
import { useAsync, useDebounced } from "@/components/admin/useAsync";
import { canEditModule, useApi } from "@/lib/admin";
import { cn, formatDate } from "@/lib/format";
import type { NewsletterIssue } from "@/lib/types";

export default function NewsletterIssuesPage() {
  return (
    <RequirePermission allow={(viewer) => canEditModule(viewer, "posts")}>
      <IssuesList />
    </RequirePermission>
  );
}

function Delivery({ issue }: { issue: NewsletterIssue }) {
  if (issue.sendStatus === "NOT_SENT") return <span className="text-ink-muted">Not sent</span>;
  if (issue.sendStatus === "SENDING") {
    return (
      <span className="text-flame-600 tabular-nums">
        Sending · {issue.sentCount}/{issue.recipientCount}
      </span>
    );
  }
  return (
    <span className={cn("tabular-nums", issue.sendStatus === "FAILED" ? "text-red-600" : "text-ink-soft")}>
      {issue.sendStatus === "FAILED" ? "Stopped · " : ""}
      {issue.sentCount} sent{issue.failedCount ? ` · ${issue.failedCount} failed` : ""}
    </span>
  );
}

function IssuesList() {
  const api = useApi();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const query = useDebounced(search);

  const { data, error, loading, reload } = useAsync(
    () =>
      api.getPaged<{ issues: NewsletterIssue[] }>("/admin/newsletter/issues", {
        page,
        limit: 20,
        q: query || undefined,
        status: status || undefined,
      }),
    [page, query, status]
  );

  const issues = data?.data.issues ?? [];

  return (
    <>
      <PageHeader
        title="Newsletter"
        description="Issues are published at /newsletter and emailed to subscribers. Write a draft, send yourself a test, then send it."
        actions={
          <AdminLinkButton href="/admin/newsletter/new">
            <Plus className="size-4" aria-hidden />
            New issue
          </AdminLinkButton>
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
            placeholder="Search issues…"
            aria-label="Search issues"
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          aria-label="Filter by status"
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Any status</option>
          <option value="PUBLISHED">Published</option>
          <option value="DRAFT">Draft</option>
        </Select>
      </div>

      {error ? <ErrorNote error={error} onRetry={reload} /> : null}

      {loading && !data ? (
        <Spinner label="Loading issues" />
      ) : (
        <>
          <TableShell>
            <thead>
              <tr>
                <Th>Title</Th>
                <Th className="w-28">Website</Th>
                <Th className="w-44">Email</Th>
                <Th className="w-36">Published</Th>
                <Th className="w-16 text-right">
                  <span className="sr-only">View</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {issues.length === 0 ? (
                <EmptyRow colSpan={5}>
                  {query || status ? "No issues match these filters." : "No issues yet. Write the first one."}
                </EmptyRow>
              ) : (
                issues.map((issue) => (
                  <tr key={issue.id} className="transition-colors hover:bg-surface-sunken/60">
                    <Td>
                      <Link
                        href={`/admin/newsletter/${issue.id}`}
                        className="font-medium text-ink transition-colors hover:text-flame-600"
                      >
                        {issue.title}
                      </Link>
                      {issue.subtitle ? (
                        <div className="mt-0.5 truncate text-[0.75rem] text-ink-muted">{issue.subtitle}</div>
                      ) : null}
                    </Td>
                    <Td>
                      <StatusPill status={issue.status} />
                    </Td>
                    <Td className="text-[0.8125rem]">
                      <Delivery issue={issue} />
                    </Td>
                    <Td className="text-[0.8125rem] text-ink-muted tabular-nums">
                      {issue.publishedAt ? formatDate(issue.publishedAt) : "—"}
                    </Td>
                    <Td>
                      <div className="flex justify-end">
                        {issue.status === "PUBLISHED" ? (
                          <a
                            href={`/newsletter/${issue.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`View ${issue.title} on the site`}
                            className="grid size-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
                          >
                            <ExternalLink className="size-3.5" />
                          </a>
                        ) : null}
                      </div>
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
      )}
    </>
  );
}
