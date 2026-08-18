"use client";

import { useCallback, useRef, useState } from "react";
import { ImageIcon, Trash2, Upload, X } from "lucide-react";
import {
  AdminButton,
  AdminEmpty,
  AdminPagination,
  ErrorNote,
  Field,
  Input,
  Modal,
  Spinner,
  useToast,
} from "./ui";
import { useAsync } from "./useAsync";
import { AdminApiError, useApi } from "@/lib/admin";
import { cn, formatBytes, mediaUrl } from "@/lib/format";
import type { Media } from "@/lib/types";

/**
 * The media library, as a browser and as a picker.
 *
 * The same grid serves both: `/admin/media` renders it inline for managing the
 * library, and every field that needs an image opens it in a modal. Uploads go
 * straight to the API, which does the S3 write and the sharp derivatives, so
 * the picker only ever deals in finished `Media` rows.
 */

const PAGE_SIZE = 24;

function MediaGrid({
  items,
  selectedId,
  onSelect,
  onDelete,
}: {
  items: Media[];
  selectedId?: string | null;
  onSelect?: (media: Media) => void;
  onDelete?: (media: Media) => void;
}) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((media) => {
        const url = mediaUrl(media, "thumb");
        const selected = selectedId === media.id;

        return (
          <li key={media.id} className="group relative">
            <button
              type="button"
              onClick={() => onSelect?.(media)}
              className={cn(
                "block w-full overflow-hidden rounded-xl border bg-surface-sunken text-left transition-all",
                selected
                  ? "border-flame-500 ring-2 ring-flame-500/30"
                  : "border-line hover:border-flame-300",
                !onSelect && "cursor-default"
              )}
            >
              <span className="block aspect-4/3 overflow-hidden bg-surface-sunken">
                {url ? (
                  // Media hosts vary per environment, so this stays a plain
                  // <img>: next/image would need every one in remotePatterns,
                  // and these are 200px admin thumbnails, not page content.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={url}
                    alt={media.alt ?? media.fileName}
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <span className="grid size-full place-items-center text-ink-muted">
                    <ImageIcon className="size-6" aria-hidden />
                  </span>
                )}
              </span>
              <span className="block px-2.5 py-2">
                <span className="block truncate text-[0.8125rem] font-medium text-ink">
                  {media.fileName}
                </span>
                <span className="mt-0.5 block text-[0.6875rem] text-ink-muted">
                  {media.width && media.height ? `${media.width}×${media.height} · ` : ""}
                  {formatBytes(media.sizeBytes)}
                </span>
              </span>
            </button>

            {onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(media)}
                aria-label={`Delete ${media.fileName}`}
                className="absolute top-2 right-2 grid size-7 place-items-center rounded-lg bg-surface/90 text-ink-muted opacity-0 shadow-sm backdrop-blur transition-all group-hover:opacity-100 hover:bg-red-600 hover:text-white focus-visible:opacity-100"
              >
                <Trash2 className="size-3.5" />
              </button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/** Upload control. Accepts a drop as readily as a click. */
function Uploader({
  folder,
  onUploaded,
}: {
  folder: string;
  onUploaded: (media: Media) => void;
}) {
  const api = useApi();
  const { notify } = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const send = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (!list.length) return;

      setBusy(true);
      let failed = 0;

      // Sequential rather than parallel: the API resizes each upload with
      // sharp, and firing ten at once buys nothing but timeouts.
      for (const file of list) {
        const form = new FormData();
        form.append("file", file, file.name);
        try {
          const media = await api.upload<Media>(
            `/admin/media/upload?folder=${encodeURIComponent(folder || "/")}`,
            form
          );
          onUploaded(media);
        } catch (cause) {
          failed += 1;
          notify(
            cause instanceof AdminApiError
              ? `${file.name}: ${cause.message}`
              : `${file.name} could not be uploaded.`,
            "error"
          );
        }
      }

      setBusy(false);
      const succeeded = list.length - failed;
      if (succeeded > 0) {
        notify(`${succeeded} ${succeeded === 1 ? "file" : "files"} uploaded.`);
      }
      if (input.current) input.current.value = "";
    },
    [api, folder, notify, onUploaded]
  );

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        void send(event.dataTransfer.files);
      }}
      className={cn(
        "rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors",
        dragging ? "border-flame-400 bg-flame-50/60" : "border-line-strong bg-surface-sunken/50"
      )}
    >
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(event) => event.target.files && void send(event.target.files)}
      />
      <Upload className="mx-auto size-5 text-ink-muted" aria-hidden />
      <p className="mt-2 text-[0.8125rem] text-ink-soft">
        Drop images here, or{" "}
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="font-medium text-flame-600 underline underline-offset-2 hover:text-flame-700"
        >
          browse
        </button>
        {folder && folder !== "/" ? ` into ${folder}` : ""}
      </p>
      <p className="mt-1 text-[0.6875rem] text-ink-muted">
        JPEG, PNG, WebP or AVIF. Up to 10 MB each — thumbnails are generated for you.
      </p>
      {busy ? (
        <p className="mt-3 text-[0.8125rem] font-medium text-flame-600">Uploading…</p>
      ) : null}
    </div>
  );
}

/** The library, laid out for a full page. */
export function MediaLibrary({
  onSelect,
  selectedId,
  deletable = true,
}: {
  onSelect?: (media: Media) => void;
  selectedId?: string | null;
  deletable?: boolean;
}) {
  const api = useApi();
  const { notify } = useToast();
  const [page, setPage] = useState(1);
  const [folder, setFolder] = useState("");
  const [pending, setPending] = useState<Media[]>([]);

  const { data, error, loading, reload } = useAsync(
    () =>
      api.getPaged<{ media: Media[] }>("/admin/media", {
        page,
        limit: PAGE_SIZE,
        folder: folder || undefined,
      }),
    [page, folder]
  );

  const remove = async (media: Media) => {
    if (!window.confirm(`Delete “${media.fileName}”? Anything using it loses its image.`)) return;
    try {
      await api.del(`/admin/media/${media.id}`);
      notify("Media deleted.");
      setPending((current) => current.filter((item) => item.id !== media.id));
      reload();
    } catch (cause) {
      notify(cause instanceof AdminApiError ? cause.message : "Could not delete.", "error");
    }
  };

  // Freshly uploaded rows are shown immediately rather than waiting for a
  // refetch, so an editor can pick what they just dropped in.
  const items = [...pending, ...(data?.data.media ?? [])].filter(
    (media, index, all) => all.findIndex((other) => other.id === media.id) === index
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <Field label="Folder" hint="Optional. Groups uploads in the library, e.g. /hero or /gallery.">
          <Input
            value={folder}
            onChange={(event) => {
              setFolder(event.target.value);
              setPage(1);
            }}
            placeholder="/"
          />
        </Field>
      </div>

      <Uploader
        folder={folder}
        onUploaded={(media) => setPending((current) => [media, ...current])}
      />

      {error ? <ErrorNote error={error} onRetry={reload} /> : null}

      {loading && !items.length ? (
        <Spinner label="Loading media" />
      ) : items.length ? (
        <>
          <MediaGrid
            items={items}
            selectedId={selectedId}
            onSelect={onSelect}
            onDelete={deletable ? remove : undefined}
          />
          <AdminPagination
            page={data?.meta.page ?? 1}
            totalPages={data?.meta.totalPages ?? 1}
            total={data?.meta.total ?? items.length}
            onPage={setPage}
          />
        </>
      ) : (
        <AdminEmpty
          title="Nothing here yet"
          description="Upload an image above and it will appear in the library."
        />
      )}
    </div>
  );
}

/** Modal wrapper, for picking an image from inside a form. */
export function MediaPickerModal({
  open,
  onClose,
  onPick,
  selectedId,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (media: Media) => void;
  selectedId?: string | null;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Choose an image" size="xl">
      <MediaLibrary
        selectedId={selectedId}
        deletable={false}
        onSelect={(media) => {
          onPick(media);
          onClose();
        }}
      />
    </Modal>
  );
}

/**
 * A single image slot on a form: shows the current pick, opens the picker, and
 * clears back to nothing. Used for covers, OG images, author photos, and hero
 * backgrounds — everywhere the model holds one `mediaId`.
 */
export function ImageField({
  label,
  hint,
  value,
  onChange,
  required,
}: {
  label: string;
  hint?: string;
  value: Media | null;
  onChange: (media: Media | null) => void;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const url = mediaUrl(value, "thumb");

  return (
    <>
      <Field label={label} hint={hint} required={required}>
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-xl border border-line-strong bg-surface-sunken transition-colors hover:border-flame-400"
          >
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt="" className="size-full object-cover" />
            ) : (
              <ImageIcon className="size-6 text-ink-muted" aria-hidden />
            )}
          </button>

          <div className="min-w-0 flex-1 pt-1">
            {value ? (
              <>
                <p className="truncate text-[0.8125rem] font-medium text-ink">{value.fileName}</p>
                <p className="mt-0.5 text-[0.6875rem] text-ink-muted">
                  {value.width && value.height ? `${value.width}×${value.height} · ` : ""}
                  {formatBytes(value.sizeBytes)}
                </p>
              </>
            ) : (
              <p className="text-[0.8125rem] text-ink-muted">No image chosen.</p>
            )}

            <div className="mt-2 flex flex-wrap gap-2">
              <AdminButton tone="secondary" size="sm" onClick={() => setOpen(true)}>
                {value ? "Replace" : "Choose image"}
              </AdminButton>
              {value ? (
                <AdminButton tone="ghost" size="sm" onClick={() => onChange(null)}>
                  <X className="size-3.5" aria-hidden />
                  Clear
                </AdminButton>
              ) : null}
            </div>
          </div>
        </div>
      </Field>

      <MediaPickerModal
        open={open}
        onClose={() => setOpen(false)}
        onPick={onChange}
        selectedId={value?.id}
      />
    </>
  );
}
