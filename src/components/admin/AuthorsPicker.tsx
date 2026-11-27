"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { Select, Spinner } from "./ui";
import { useAsync } from "./useAsync";
import { useApi } from "@/lib/admin";
import type { Author } from "@/lib/types";

/**
 * An ordered byline picked from the Authors directory: add from a list, move
 * up or down, remove. The value is the ordered list of author ids.
 */
export function AuthorsPicker({
  value,
  onChange,
  emptyHint,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  /** Shown when nobody is chosen yet. */
  emptyHint?: string;
}) {
  const api = useApi();
  const directory = useAsync(
    async () => (await api.getPaged<{ authors: Author[] }>("/admin/authors", { limit: 100 })).data.authors,
    []
  );

  const byId = (id: string) => directory.data?.find((author) => author.id === id);

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  if (directory.loading && !directory.data) return <Spinner label="Loading authors" />;

  const available = (directory.data ?? []).filter((author) => !value.includes(author.id));

  return (
    <div className="space-y-3">
      {value.length ? (
        <ul className="space-y-2">
          {value.map((id, index) => {
            const author = byId(id);
            return (
              <li
                key={id}
                className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5"
              >
                <span className="flex flex-col text-ink-muted">
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
                    disabled={index === value.length - 1}
                    aria-label="Move down"
                    className="leading-none disabled:opacity-30"
                  >
                    ▼
                  </button>
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink">
                    {author?.name ?? "Unknown author"}
                  </span>
                  {author?.affiliation ? (
                    <span className="block truncate text-[0.75rem] text-ink-muted">
                      {author.affiliation}
                    </span>
                  ) : null}
                </span>

                <button
                  type="button"
                  onClick={() => onChange(value.filter((item) => item !== id))}
                  aria-label={`Remove ${author?.name ?? "author"}`}
                  className="grid size-7 shrink-0 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-[0.8125rem] text-ink-muted">{emptyHint ?? "No authors chosen yet."}</p>
      )}

      <Select
        value=""
        aria-label="Add an author"
        onChange={(event) => event.target.value && onChange([...value, event.target.value])}
      >
        <option value="">Add an author…</option>
        {available.map((author) => (
          <option key={author.id} value={author.id}>
            {author.name}
            {author.affiliation ? ` — ${author.affiliation}` : ""}
          </option>
        ))}
      </Select>

      <p className="text-[0.75rem] text-ink-muted">
        Someone missing?{" "}
        <Link href="/admin/authors" target="_blank" className="font-medium text-flame-600 hover:text-flame-700">
          Add them under Authors
        </Link>
        , then reload this page.
      </p>
    </div>
  );
}
