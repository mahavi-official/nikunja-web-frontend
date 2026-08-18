"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ImagePlus, Save, Trash2 } from "lucide-react";
import {
  AdminButton,
  AdminEmpty,
  ErrorNote,
  Field,
  Input,
  PageHeader,
  Panel,
  Spinner,
  Switch,
  Textarea,
  useConfirm,
  useToast,
} from "@/components/admin/ui";
import { ImageField, MediaPickerModal } from "@/components/admin/MediaPicker";
import { SeoPanel } from "@/components/admin/SeoPanel";
import { RequirePermission } from "@/components/admin/AdminShell";
import { useAsync } from "@/components/admin/useAsync";
import { AdminApiError, canEditModule, useApi } from "@/lib/admin";
import { mediaUrl } from "@/lib/format";
import type { GalleryImage, GallerySegment, Media } from "@/lib/types";

export default function GallerySegmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <RequirePermission allow={(viewer) => canEditModule(viewer, "gallery")}>
      <SegmentEditor id={id} />
    </RequirePermission>
  );
}

function SegmentEditor({ id }: { id: string }) {
  const api = useApi();
  const router = useRouter();
  const { notify } = useToast();
  const { confirm, dialog } = useConfirm();

  const { data, error, loading, reload } = useAsync(
    () => api.get<GallerySegment & { metaTitle?: string; metaDescription?: string }>(`/admin/gallery/${id}`),
    [id]
  );

  const [details, setDetails] = useState({
    name: "",
    slug: "",
    description: "",
    coverImage: null as Media | null,
    isPublished: true,
    metaTitle: "",
    metaDescription: "",
    noIndex: false,
  });
  const [savingDetails, setSavingDetails] = useState(false);

  /** Local copy of the ordering, so drag-free reordering feels instant. */
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [dirtyOrder, setDirtyOrder] = useState(false);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    if (!data) return;
    setDetails({
      name: data.name,
      slug: data.slug,
      description: data.description ?? "",
      coverImage: data.coverImage,
      isPublished: data.isPublished,
      metaTitle: data.metaTitle ?? "",
      metaDescription: data.metaDescription ?? "",
      noIndex: data.noIndex,
    });
    setImages([...(data.images ?? [])].sort((a, b) => a.order - b.order));
    setDirtyOrder(false);
  }, [data]);

  const saveDetails = async () => {
    setSavingDetails(true);
    try {
      await api.patch(`/admin/gallery/${id}`, {
        name: details.name.trim(),
        slug: details.slug.trim() || undefined,
        description: details.description.trim() || undefined,
        coverImageId: details.coverImage?.id,
        isPublished: details.isPublished,
        metaTitle: details.metaTitle.trim() || undefined,
        metaDescription: details.metaDescription.trim() || undefined,
        noIndex: details.noIndex,
      });
      notify("Segment saved.");
      reload();
    } catch (cause) {
      notify(cause instanceof AdminApiError ? cause.message : "Could not save.", "error");
    } finally {
      setSavingDetails(false);
    }
  };

  const addImage = async (media: Media) => {
    try {
      await api.post(`/admin/gallery/${id}/images`, {
        images: [
          {
            mediaId: media.id,
            // Alt text is required by the API. The media row's own alt is the
            // best default; the editor can refine it in place below.
            alt: media.alt?.trim() || media.fileName.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
          },
        ],
      });
      notify("Image added.");
      reload();
    } catch (cause) {
      notify(cause instanceof AdminApiError ? cause.message : "Could not add the image.", "error");
    }
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    setImages(next);
    setDirtyOrder(true);
  };

  const saveOrder = async () => {
    try {
      await api.post(`/admin/gallery/${id}/reorder`, {
        items: images.map((image, index) => ({ id: image.id, order: index })),
      });
      notify("Order saved.");
      setDirtyOrder(false);
      reload();
    } catch (cause) {
      notify(cause instanceof AdminApiError ? cause.message : "Could not save the order.", "error");
    }
  };

  const removeImage = async (image: GalleryImage) => {
    const confirmed = await confirm({
      title: "Remove this image?",
      body: "It leaves this segment. The file stays in the media library.",
      confirmLabel: "Remove",
    });
    if (!confirmed) return;

    try {
      await api.del(`/admin/gallery/images/${image.id}`);
      notify("Image removed.");
      reload();
    } catch (cause) {
      notify(cause instanceof AdminApiError ? cause.message : "Could not remove.", "error");
    }
  };

  const removeSegment = async () => {
    const confirmed = await confirm({
      title: `Delete “${details.name}”?`,
      body: "The segment and its arrangement go. The photographs stay in the media library.",
    });
    if (!confirmed) return;

    try {
      await api.del(`/admin/gallery/${id}`);
      notify("Segment deleted.");
      router.push("/admin/gallery");
    } catch (cause) {
      notify(cause instanceof AdminApiError ? cause.message : "Could not delete.", "error");
    }
  };

  if (loading && !data) return <Spinner label="Loading segment" />;
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <>
      <PageHeader
        title={details.name || "Untitled segment"}
        description={`${images.length} ${images.length === 1 ? "image" : "images"} in this segment`}
        breadcrumb={[{ label: "Gallery", href: "/admin/gallery" }, { label: "Segment" }]}
        actions={
          <>
            {dirtyOrder ? (
              <AdminButton onClick={saveOrder}>
                <Save className="size-4" aria-hidden />
                Save order
              </AdminButton>
            ) : null}
            <AdminButton tone="secondary" onClick={() => setPicking(true)}>
              <ImagePlus className="size-4" aria-hidden />
              Add image
            </AdminButton>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Panel
            title="Images"
            description="The order here is the order on the public page."
            bodyClassName={images.length ? "p-4" : "p-5"}
          >
            {images.length ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {images.map((image, index) => {
                  const url = mediaUrl(image.media, "medium");
                  return (
                    <li
                      key={image.id}
                      className="group overflow-hidden rounded-xl border border-line bg-surface"
                    >
                      <div className="relative aspect-4/3 bg-surface-sunken">
                        {url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={url} alt={image.alt} loading="lazy" className="size-full object-cover" />
                        ) : null}
                        <span className="absolute top-2 left-2 rounded bg-navy-950/75 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-white tabular-nums">
                          {index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeImage(image)}
                          aria-label="Remove image"
                          className="absolute top-2 right-2 grid size-7 place-items-center rounded-lg bg-surface/90 text-ink-muted opacity-0 backdrop-blur transition-all group-hover:opacity-100 hover:bg-red-600 hover:text-white focus-visible:opacity-100"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>

                      <div className="p-2.5">
                        <p className="line-clamp-2 text-[0.75rem] text-ink-soft" title={image.alt}>
                          {image.alt}
                        </p>
                        <div className="mt-2 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => move(index, -1)}
                            disabled={index === 0}
                            aria-label="Move earlier"
                            className="grid size-7 place-items-center rounded text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
                          >
                            <ArrowLeft className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => move(index, 1)}
                            disabled={index === images.length - 1}
                            aria-label="Move later"
                            className="grid size-7 place-items-center rounded text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
                          >
                            <ArrowRight className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <AdminEmpty
                title="No images in this segment"
                description="Add photographs from the media library, then arrange them."
                action={<AdminButton onClick={() => setPicking(true)}>Add an image</AdminButton>}
              />
            )}
          </Panel>

          <SeoPanel
            metaTitle={details.metaTitle}
            metaDescription={details.metaDescription}
            noIndex={details.noIndex}
            fallbackTitle={details.name}
            fallbackDescription={details.description}
            path={`/gallery/${details.slug}`}
            showKeywords={false}
            showCanonical={false}
            showOgImage={false}
            onChange={(patch) => setDetails({ ...details, ...patch })}
          />
        </div>

        <div className="space-y-5">
          <Panel title="Segment details">
            <div className="space-y-4">
              <Field label="Name" required>
                <Input
                  value={details.name}
                  onChange={(event) => setDetails({ ...details, name: event.target.value })}
                />
              </Field>

              <Field label="Slug" hint="Changing this leaves a permanent redirect.">
                <Input
                  value={details.slug}
                  onChange={(event) => setDetails({ ...details, slug: event.target.value })}
                  className="font-mono text-[0.8125rem]"
                />
              </Field>

              <Field label="Description">
                <Textarea
                  rows={4}
                  value={details.description}
                  onChange={(event) => setDetails({ ...details, description: event.target.value })}
                />
              </Field>

              <ImageField
                label="Cover image"
                value={details.coverImage}
                onChange={(media) => setDetails({ ...details, coverImage: media })}
              />

              <Switch
                checked={details.isPublished}
                onChange={(next) => setDetails({ ...details, isPublished: next })}
                label="Published"
                hint="Visible in the public gallery."
              />

              <AdminButton onClick={saveDetails} loading={savingDetails} className="w-full">
                <Save className="size-4" aria-hidden />
                Save details
              </AdminButton>
            </div>
          </Panel>

          <Panel title="Danger zone">
            <AdminButton tone="danger" onClick={removeSegment} className="w-full">
              <Trash2 className="size-4" aria-hidden />
              Delete this segment
            </AdminButton>
          </Panel>
        </div>
      </div>

      <MediaPickerModal open={picking} onClose={() => setPicking(false)} onPick={addImage} />
      {dialog}
    </>
  );
}
