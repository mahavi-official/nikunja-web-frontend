"use client";

import { useState } from "react";
import {
  AdminEmpty,
  AdminPagination,
  EmptyRow,
  ErrorNote,
  Input,
  PageHeader,
  Select,
  Spinner,
  TableShell,
  Td,
  Th,
} from "@/components/admin/ui";
import { RequirePermission } from "@/components/admin/AdminShell";
import { useAsync, useDebounced } from "@/components/admin/useAsync";
import { isAdmin, useApi, type AdminUser, type AuditEntry } from "@/lib/admin";
import { formatDate } from "@/lib/format";

/**
 * The audit trail.
 *
 * Every staff action is recorded, and entries are pruned by a scheduled job —
 * so this is a recent history, not an archive. Worth saying on the screen,
 * because "it isn't here" and "it never happened" are different answers.
 */

const ENTITY_TYPES = [
  "post",
  "research",
  "media",
  "user",
  "gallerySegment",
  "video",
  "author",
  "setting",
  "auth",
];

export default function AuditPage() {
  return (
    <RequirePermission allow={isAdmin}>
      <AuditLog />
    </RequirePermission>
  );
}

function AuditLog() {
  const api = useApi();

  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState("");
  const [userId, setUserId] = useState("");
  const [action, setAction] = useState("");
  const actionQuery = useDebounced(action);

  const users = useAsync(
    () => api.getPaged<{ users: AdminUser[] }>("/admin/users", { limit: 100 }),
    []
  );

  const { data, error, loading, reload } = useAsync(
    () =>
      api.getPaged<{ logs: AuditEntry[] }>("/admin/audit-logs", {
        page,
        limit: 50,
        entityType: entityType || undefined,
        userId: userId || undefined,
        action: actionQuery || undefined,
      }),
    [page, entityType, userId, actionQuery]
  );

  const logs = data?.data.logs ?? [];

  /** Staff only — a member has nothing to audit. */
  const staff = (users.data?.data.users ?? []).filter((user) => user.role !== "MEMBER");

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Who changed what, and when. Older entries are pruned by a weekly job."
      />

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <Select
          value={userId}
          aria-label="Filter by user"
          onChange={(event) => {
            setUserId(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Anyone</option>
          {staff.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </Select>

        <Select
          value={entityType}
          aria-label="Filter by entity"
          onChange={(event) => {
            setEntityType(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Anything</option>
          {ENTITY_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Select>

        <Input
          value={action}
          onChange={(event) => {
            setAction(event.target.value);
            setPage(1);
          }}
          placeholder="Exact action, e.g. post.publish"
          aria-label="Filter by action"
          className="font-mono text-[0.8125rem]"
        />
      </div>

      {error ? <ErrorNote error={error} onRetry={reload} /> : null}

      {loading && !data ? (
        <Spinner label="Loading the audit log" />
      ) : logs.length ? (
        <>
          <TableShell>
            <thead>
              <tr>
                <Th className="w-44">When</Th>
                <Th className="w-44">Who</Th>
                <Th className="w-52">Action</Th>
                <Th>Entity</Th>
                <Th className="w-32">IP</Th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <EmptyRow colSpan={5}>Nothing matches these filters.</EmptyRow>
              ) : (
                logs.map((entry) => (
                  <tr key={entry.id} className="transition-colors hover:bg-surface-sunken/60">
                    <Td className="text-[0.8125rem] text-ink-muted tabular-nums">
                      {formatDate(entry.createdAt)}
                    </Td>
                    <Td className="text-[0.8125rem]">
                      {entry.user ? (
                        <>
                          <span className="font-medium text-ink">{entry.user.name}</span>
                          <span className="mt-0.5 block truncate text-[0.75rem] text-ink-muted">
                            {entry.user.email}
                          </span>
                        </>
                      ) : (
                        <span className="text-ink-muted">System</span>
                      )}
                    </Td>
                    <Td>
                      <code className="rounded bg-surface-sunken px-1.5 py-0.5 font-mono text-[0.75rem] text-ink-soft">
                        {entry.action}
                      </code>
                    </Td>
                    <Td className="text-[0.8125rem] text-ink-muted">
                      {entry.entityType ? (
                        <>
                          {entry.entityType}
                          {entry.entityId ? (
                            <span className="ml-1 font-mono text-[0.6875rem] opacity-70">
                              {entry.entityId.slice(-8)}
                            </span>
                          ) : null}
                        </>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td className="font-mono text-[0.75rem] text-ink-muted">{entry.ip ?? "—"}</Td>
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
          title="No entries"
          description={
            entityType || userId || actionQuery
              ? "Nothing matches these filters."
              : "Actions taken in the studio will be recorded here."
          }
        />
      )}
    </>
  );
}
