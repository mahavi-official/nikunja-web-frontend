"use client";

import { useState } from "react";
import { Lock, Plus, ShieldCheck, Trash2, UserCheck, UserX } from "lucide-react";
import {
  AdminButton,
  AdminPagination,
  EmptyRow,
  ErrorNote,
  Field,
  InfoNote,
  Input,
  Modal,
  PageHeader,
  RolePill,
  Select,
  Spinner,
  StatusPill,
  TableShell,
  Td,
  Th,
  useConfirm,
  useToast,
} from "@/components/admin/ui";
import { RequirePermission } from "@/components/admin/AdminShell";
import { useAsync } from "@/components/admin/useAsync";
import { useAuth } from "@/components/providers/AuthProvider";
import { AdminApiError, EDITOR_MODULES, isAdmin, isSuperAdmin, useApi, type AdminUser } from "@/lib/admin";
import { formatDate } from "@/lib/format";
import type { Role } from "@/lib/types";

/**
 * Staff and readers.
 *
 * Access is granted by whitelisting an email before its owner has ever signed
 * in: the row sits at WHITELISTED until a Google sign-in matches it, at which
 * point the account binds and becomes ACTIVE. That is why "add user" asks for
 * an email and a role but never a password — there are none anywhere.
 */

const ROLES: { value: Role; label: string; note: string }[] = [
  { value: "MEMBER", label: "Member", note: "Reads, comments, and opens gated PDFs." },
  { value: "EDITOR", label: "Editor", note: "Edits only the modules granted below." },
  { value: "ADMIN", label: "Admin", note: "Everything except settings and redirects." },
  { value: "SUPER_ADMIN", label: "Super admin", note: "Everything, including site settings." },
];

export default function UsersPage() {
  return (
    <RequirePermission allow={isAdmin}>
      <UsersList />
    </RequirePermission>
  );
}

function UsersList() {
  const api = useApi();
  const { user: viewer } = useAuth();
  const { notify } = useToast();
  const { confirm, dialog } = useConfirm();

  const [page, setPage] = useState(1);
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: "",
    name: "",
    role: "EDITOR" as Role,
    editorModules: [] as string[],
  });

  const { data, error, loading, reload } = useAsync(
    () => api.getPaged<{ users: AdminUser[] }>("/admin/users", { page, limit: 25 }),
    [page]
  );

  const openInvite = () => {
    setForm({ email: "", name: "", role: "EDITOR", editorModules: [] });
    setFormError(null);
    setInviting(true);
  };

  const openEdit = (user: AdminUser) => {
    setForm({
      email: user.email,
      name: user.name,
      role: user.role,
      editorModules: user.editorModules ?? [],
    });
    setFormError(null);
    setEditing(user);
  };

  const create = async () => {
    if (!form.email.trim() || !form.name.trim()) {
      setFormError("An email and a name are both required.");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      await api.post("/admin/users", {
        email: form.email.trim().toLowerCase(),
        name: form.name.trim(),
        role: form.role,
        editorModules: form.role === "EDITOR" ? form.editorModules : [],
      });
      notify("User whitelisted. They can now sign in with Google.");
      setInviting(false);
      reload();
    } catch (cause) {
      setFormError(cause instanceof AdminApiError ? cause.message : "Could not add this user.");
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    setFormError(null);

    try {
      // The API accepts only name and module grants here — a role change is
      // not offered, and email is the account's identity.
      await api.patch(`/admin/users/${editing.id}`, {
        name: form.name.trim(),
        editorModules: form.role === "EDITOR" ? form.editorModules : [],
      });
      notify("User updated.");
      setEditing(null);
      reload();
    } catch (cause) {
      setFormError(cause instanceof AdminApiError ? cause.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (user: AdminUser, action: "suspend" | "activate") => {
    try {
      await api.post(`/admin/users/${user.id}/${action}`);
      notify(action === "suspend" ? "Account suspended." : "Account reactivated.");
      reload();
    } catch (cause) {
      notify(cause instanceof AdminApiError ? cause.message : "Could not update.", "error");
    }
  };

  const remove = async (user: AdminUser) => {
    const confirmed = await confirm({
      title: `Delete ${user.name}?`,
      body: `${user.email} loses access immediately. Anything they wrote stays published.`,
    });
    if (!confirmed) return;

    try {
      await api.del(`/admin/users/${user.id}`);
      notify("User deleted.");
      reload();
    } catch (cause) {
      notify(cause instanceof AdminApiError ? cause.message : "Could not delete.", "error");
    }
  };

  const users = data?.data.users ?? [];

  /** A protected super admin, or yourself: neither can be locked out here. */
  const isLocked = (user: AdminUser) => user.isProtected || user.id === viewer?.id;

  const roleField = (
    <>
      <Field label="Role">
        <Select
          value={form.role}
          disabled={!!editing}
          onChange={(event) => setForm({ ...form, role: event.target.value as Role })}
        >
          {ROLES.filter(
            // Only a super admin can mint another one.
            (role) => role.value !== "SUPER_ADMIN" || isSuperAdmin(viewer)
          ).map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </Select>
      </Field>
      <p className="-mt-2 text-[0.8125rem] text-ink-muted">
        {ROLES.find((role) => role.value === form.role)?.note}
      </p>

      {form.role === "EDITOR" ? (
        <Field label="Modules" hint="An editor can only reach the sections ticked here.">
          <div className="grid gap-1.5 sm:grid-cols-2">
            {EDITOR_MODULES.map((module) => (
              <label
                key={module}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1.5 text-sm capitalize transition-colors hover:bg-surface-sunken"
              >
                <input
                  type="checkbox"
                  checked={form.editorModules.includes(module)}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      editorModules: event.target.checked
                        ? [...form.editorModules, module]
                        : form.editorModules.filter((item) => item !== module),
                    })
                  }
                  className="size-4 accent-[var(--color-flame-500)]"
                />
                {module}
              </label>
            ))}
          </div>
        </Field>
      ) : null}
    </>
  );

  return (
    <>
      <PageHeader
        title="Users"
        description="Sign-in is Google only. Adding someone here whitelists their email — they set no password, because there are none."
        actions={
          <AdminButton onClick={openInvite}>
            <Plus className="size-4" aria-hidden />
            Add user
          </AdminButton>
        }
      />

      {error ? <ErrorNote error={error} onRetry={reload} /> : null}

      {loading && !data ? (
        <Spinner label="Loading users" />
      ) : (
        <>
          <TableShell>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th className="w-32">Role</Th>
                <Th className="w-32">Status</Th>
                <Th className="w-36">Last sign-in</Th>
                <Th className="w-44 text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <EmptyRow colSpan={5}>No users yet.</EmptyRow>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="transition-colors hover:bg-surface-sunken/60">
                    <Td>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-ink">{user.name}</span>
                        {user.isProtected ? (
                          <span title="Protected account — cannot be changed here">
                            <ShieldCheck className="size-3.5 text-flame-600" aria-hidden />
                          </span>
                        ) : null}
                        {user.id === viewer?.id ? (
                          <span className="text-[0.6875rem] text-ink-muted">(you)</span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 truncate text-[0.75rem] text-ink-muted">{user.email}</p>
                      {user.role === "EDITOR" && user.editorModules?.length ? (
                        <p className="mt-0.5 text-[0.6875rem] text-ink-muted capitalize">
                          {user.editorModules.join(", ")}
                        </p>
                      ) : null}
                    </Td>
                    <Td>
                      <RolePill role={user.role} />
                    </Td>
                    <Td>
                      <StatusPill status={user.status} />
                    </Td>
                    <Td className="text-[0.8125rem] text-ink-muted tabular-nums">
                      {user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"}
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1.5">
                        {isLocked(user) ? (
                          <span className="inline-flex items-center gap-1 text-[0.75rem] text-ink-muted">
                            <Lock className="size-3" aria-hidden />
                            Locked
                          </span>
                        ) : (
                          <>
                            <AdminButton tone="secondary" size="sm" onClick={() => openEdit(user)}>
                              Edit
                            </AdminButton>
                            <button
                              type="button"
                              onClick={() =>
                                setStatus(user, user.status === "SUSPENDED" ? "activate" : "suspend")
                              }
                              aria-label={
                                user.status === "SUSPENDED"
                                  ? `Reactivate ${user.name}`
                                  : `Suspend ${user.name}`
                              }
                              className="grid size-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
                            >
                              {user.status === "SUSPENDED" ? (
                                <UserCheck className="size-3.5" />
                              ) : (
                                <UserX className="size-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => remove(user)}
                              aria-label={`Delete ${user.name}`}
                              className="grid size-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </>
                        )}
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

      <Modal
        open={inviting}
        onClose={() => setInviting(false)}
        title="Add user"
        description="Whitelists an email. The account activates the first time they sign in with Google."
        size="md"
        footer={
          <>
            <AdminButton tone="ghost" onClick={() => setInviting(false)}>
              Cancel
            </AdminButton>
            <AdminButton onClick={create} loading={saving}>
              Add user
            </AdminButton>
          </>
        }
      >
        <div className="space-y-4">
          {formError ? <ErrorNote error={formError} /> : null}

          <InfoNote>
            The email must be the Google account they will sign in with. Nothing is emailed
            automatically — tell them the studio is at <strong>/admin</strong>.
          </InfoNote>

          <Field label="Email" required>
            <Input
              autoFocus
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="editor@example.org"
            />
          </Field>

          <Field label="Name" required>
            <Input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </Field>

          {roleField}
        </div>
      </Modal>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={`Edit ${editing?.name ?? ""}`}
        size="md"
        footer={
          <>
            <AdminButton tone="ghost" onClick={() => setEditing(null)}>
              Cancel
            </AdminButton>
            <AdminButton onClick={saveEdit} loading={saving}>
              Save
            </AdminButton>
          </>
        }
      >
        <div className="space-y-4">
          {formError ? <ErrorNote error={formError} /> : null}

          <Field label="Email" hint="An account's email is its identity and cannot be changed.">
            <Input value={form.email} disabled />
          </Field>

          <Field label="Name" required>
            <Input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </Field>

          {roleField}
        </div>
      </Modal>

      {dialog}
    </>
  );
}
