"use client";

import { useState } from "react";
import { ArrowRight, Plus, Trash2, Wand2 } from "lucide-react";
import {
  AdminButton,
  AdminEmpty,
  AdminPagination,
  EmptyRow,
  ErrorNote,
  Field,
  InfoNote,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  TableShell,
  Td,
  Th,
  useConfirm,
  useToast,
} from "@/components/admin/ui";
import { RequirePermission } from "@/components/admin/AdminShell";
import { useAsync } from "@/components/admin/useAsync";
import { AdminApiError, isSuperAdmin, useApi, type RedirectRule } from "@/lib/admin";
import { formatDate } from "@/lib/format";

/**
 * URL redirects.
 *
 * Most rows here are written automatically — renaming a published slug leaves a
 * 301 from the old address so nothing that was ever linked to breaks. Manual
 * rows are for addresses that predate the site.
 */
export default function RedirectsPage() {
  return (
    <RequirePermission allow={isSuperAdmin}>
      <Redirects />
    </RequirePermission>
  );
}

function Redirects() {
  const api = useApi();
  const { notify } = useToast();
  const { confirm, dialog } = useConfirm();

  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({ fromPath: "", toPath: "", statusCode: "301" });

  const { data, error, loading, reload } = useAsync(
    () => api.getPaged<{ redirects: RedirectRule[] }>("/admin/redirects", { page, limit: 50 }),
    [page]
  );

  const create = async () => {
    if (!form.fromPath.trim() || !form.toPath.trim()) {
      setFormError("Both paths are required.");
      return;
    }
    if (!form.fromPath.startsWith("/") || !form.toPath.startsWith("/")) {
      setFormError("Paths must start with a slash, e.g. /old-address.");
      return;
    }
    if (form.fromPath.trim() === form.toPath.trim()) {
      setFormError("A redirect to itself would loop.");
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      await api.post("/admin/redirects", {
        fromPath: form.fromPath.trim(),
        toPath: form.toPath.trim(),
        statusCode: Number(form.statusCode),
      });
      notify("Redirect created.");
      setCreating(false);
      setForm({ fromPath: "", toPath: "", statusCode: "301" });
      reload();
    } catch (cause) {
      setFormError(cause instanceof AdminApiError ? cause.message : "Could not create the redirect.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (rule: RedirectRule) => {
    const confirmed = await confirm({
      title: "Delete this redirect?",
      body: `${rule.fromPath} will start returning a 404 again.`,
    });
    if (!confirmed) return;

    try {
      await api.del(`/admin/redirects/${rule.id}`);
      notify("Redirect deleted.");
      reload();
    } catch (cause) {
      notify(cause instanceof AdminApiError ? cause.message : "Could not delete.", "error");
    }
  };

  const redirects = data?.data.redirects ?? [];

  return (
    <>
      <PageHeader
        title="Redirects"
        description="Old addresses pointed at their current ones."
        actions={
          <AdminButton
            onClick={() => {
              setFormError(null);
              setCreating(true);
            }}
          >
            <Plus className="size-4" aria-hidden />
            Add redirect
          </AdminButton>
        }
      />

      <div className="mb-5">
        <InfoNote>
          Rows marked <strong>automatic</strong> were written by the CMS when a published slug
          changed. Deleting one breaks whatever still links to the old address, so leave them alone
          unless you are certain.
        </InfoNote>
      </div>

      {error ? <ErrorNote error={error} onRetry={reload} /> : null}

      {loading && !data ? (
        <Spinner label="Loading redirects" />
      ) : redirects.length ? (
        <>
          <TableShell>
            <thead>
              <tr>
                <Th>From</Th>
                <Th>To</Th>
                <Th className="w-20">Code</Th>
                <Th className="w-28">Origin</Th>
                <Th className="w-32">Created</Th>
                <Th className="w-16" />
              </tr>
            </thead>
            <tbody>
              {redirects.length === 0 ? (
                <EmptyRow colSpan={6}>No redirects yet.</EmptyRow>
              ) : (
                redirects.map((rule) => (
                  <tr key={rule.id} className="transition-colors hover:bg-surface-sunken/60">
                    <Td className="font-mono text-[0.8125rem] text-ink">{rule.fromPath}</Td>
                    <Td>
                      <span className="flex items-center gap-1.5 font-mono text-[0.8125rem] text-ink-soft">
                        <ArrowRight className="size-3 shrink-0 text-ink-muted" aria-hidden />
                        {rule.toPath}
                      </span>
                    </Td>
                    <Td className="text-[0.8125rem] text-ink-muted tabular-nums">
                      {rule.statusCode}
                    </Td>
                    <Td>
                      {rule.isAuto ? (
                        <span className="inline-flex items-center gap-1 text-[0.75rem] text-ink-muted">
                          <Wand2 className="size-3" aria-hidden />
                          automatic
                        </span>
                      ) : (
                        <span className="text-[0.75rem] text-ink-muted">manual</span>
                      )}
                    </Td>
                    <Td className="text-[0.8125rem] text-ink-muted tabular-nums">
                      {formatDate(rule.createdAt)}
                    </Td>
                    <Td>
                      <button
                        type="button"
                        onClick={() => remove(rule)}
                        aria-label={`Delete redirect from ${rule.fromPath}`}
                        className="grid size-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
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
          title="No redirects"
          description="One appears here automatically the first time a published slug changes."
        />
      )}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Add redirect"
        size="md"
        footer={
          <>
            <AdminButton tone="ghost" onClick={() => setCreating(false)}>
              Cancel
            </AdminButton>
            <AdminButton onClick={create} loading={saving}>
              Create
            </AdminButton>
          </>
        }
      >
        <div className="space-y-4">
          {formError ? <ErrorNote error={formError} /> : null}

          <Field label="From" required hint="The old path, starting with a slash.">
            <Input
              autoFocus
              value={form.fromPath}
              onChange={(event) => setForm({ ...form, fromPath: event.target.value })}
              placeholder="/old-address"
              className="font-mono text-[0.8125rem]"
            />
          </Field>

          <Field label="To" required hint="Where it should land.">
            <Input
              value={form.toPath}
              onChange={(event) => setForm({ ...form, toPath: event.target.value })}
              placeholder="/articles/the-new-address"
              className="font-mono text-[0.8125rem]"
            />
          </Field>

          <Field
            label="Status code"
            hint="301 tells search engines the move is permanent and passes ranking on. Use 302 only for something genuinely temporary."
          >
            <Select
              value={form.statusCode}
              onChange={(event) => setForm({ ...form, statusCode: event.target.value })}
            >
              <option value="301">301 — permanent</option>
              <option value="302">302 — temporary</option>
            </Select>
          </Field>
        </div>
      </Modal>

      {dialog}
    </>
  );
}
