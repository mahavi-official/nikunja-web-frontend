"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, FileText, Plus, Search, Star, Trash2 } from "lucide-react";
import {
  AdminButton,
  AdminLinkButton,
  AdminPagination,
  EmptyRow,
  ErrorNote,
  Input,
  PageHeader,
  Spinner,
  StatusPill,
  TableShell,
  Td,
  Th,
  useConfirm,
  useToast,
} from "@/components/admin/ui";
import { RequirePermission } from "@/components/admin/AdminShell";
import { useAsync, useDebounced } from "@/components/admin/useAsync";
import { AdminApiError, canEditModule, useApi } from "@/lib/admin";
import { formatDate } from "@/lib/format";
import type { Research } from "@/lib/types";

export default function ResearchPage() {
  return (
    <RequirePermission allow={(viewer) => canEditModule(viewer, "research")}>
      <ResearchList />
    </RequirePermission>
  );
}

function ResearchList() {
  const api = useApi();
  const { notify } = useToast();
  const { confirm, dialog } = useConfirm();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const query = useDebounced(search);

  const { data, error, loading, reload } = useAsync(
    () =>
      api.getPaged<{ research: Research[] }>("/admin/research", {
        page,
        limit: 20,
        q: query || undefined,
      }),
    [page, query]
  );

  const items = data?.data.research ?? [];

  const togglePublish = async (item: Research) => {
    const next = item.status === "PUBLISHED" ? "unpublish" : "publish";
    try {
      await api.post(`/admin/research/${item.id}/${next}`);
      notify(next === "publish" ? "Publication is live." : "Moved back to draft.");
      reload();
    } catch (cause) {
      notify(cause instanceof AdminApiError ? cause.message : "Could not update.", "error");
    }
  };

  const remove = async (item: Research) => {
    const confirmed = await confirm({
      title: "Delete this publication?",
      body: `“${item.title}” and its attached PDFs will be removed. This cannot be undone.`,
    });
    if (!confirmed) return;

    try {
      await api.del(`/admin/research/${item.id}`);
      notify("Publication deleted.");
      reload();
    } catch (cause) {
      notify(cause instanceof AdminApiError ? cause.message : "Could not delete.", "error");
    }
  };

  return (
    <>
      <PageHeader
        title="Research"
        description="Publications. Abstracts are public; the PDFs are gated behind a signed-in reader."
        actions={
          <AdminLinkButton href="/admin/research/new">
            <Plus className="size-4" aria-hidden />
            New publication
          </AdminLinkButton>
        }
      />

      <div className="relative mb-4">
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
          placeholder="Search titles, abstracts, and extracted PDF text…"
          aria-label="Search publications"
          className="pl-9"
        />
      </div>

      {error ? <ErrorNote error={error} onRetry={reload} /> : null}

      {loading && !data ? (
        <Spinner label="Loading publications" />
      ) : (
        <>
          <TableShell>
            <thead>
              <tr>
                <Th>Title</Th>
                <Th className="w-48">Authors</Th>
                <Th className="w-20">Files</Th>
                <Th className="w-28">Status</Th>
                <Th className="w-40 text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <EmptyRow colSpan={5}>
                  {query ? "No publications match that search." : "No publications yet."}
                </EmptyRow>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-surface-sunken/60">
                    <Td>
                      <Link
                        href={`/admin/research/${item.id}`}
                        className="font-medium text-ink transition-colors hover:text-flame-600"
                      >
                        {item.title}
                      </Link>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[0.75rem] text-ink-muted">
                        {item.publicationYear ? <span>{item.publicationYear}</span> : null}
                        {item.journal ? <span className="italic">{item.journal}</span> : null}
                        {item.publishedAt ? <span>{formatDate(item.publishedAt)}</span> : null}
                        {item.isFeatured ? (
                          <span className="inline-flex items-center gap-1 text-flame-600">
                            <Star className="size-3 fill-current" aria-hidden />
                            Featured
                          </span>
                        ) : null}
                      </div>
                    </Td>
                    <Td className="text-[0.8125rem] text-ink-soft">
                      {item.authors?.length
                        ? item.authors
                            .map((link) => link.author?.name)
                            .filter(Boolean)
                            .join(", ")
                        : "—"}
                    </Td>
                    <Td className="text-[0.8125rem] text-ink-muted">
                      {item.files?.length ? (
                        <span className="inline-flex items-center gap-1">
                          <FileText className="size-3.5" aria-hidden />
                          {item.files.length}
                        </span>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td>
                      <StatusPill status={item.status} />
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1.5">
                        {item.status === "PUBLISHED" ? (
                          <a
                            href={`/research/${item.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`View ${item.title} on the site`}
                            className="grid size-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
                          >
                            <ExternalLink className="size-3.5" />
                          </a>
                        ) : null}
                        <AdminButton tone="secondary" size="sm" onClick={() => togglePublish(item)}>
                          {item.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                        </AdminButton>
                        <button
                          type="button"
                          onClick={() => remove(item)}
                          aria-label={`Delete ${item.title}`}
                          className="grid size-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
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

      {dialog}
    </>
  );
}
