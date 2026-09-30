"use client";

import { ChevronLeft, ChevronRight, Download, ImagePlus, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { prepareAlbumUpload } from "@/lib/album/compress";
import { saveSharedPhotos } from "@/lib/album/save-client";
import { displayName } from "@/lib/utils";
import type { AlbumPhoto } from "@/types";

type AlbumPayload = {
  photos: AlbumPhoto[];
  limit: number;
  count: number;
  remaining: number;
  plan: "free" | "pro";
  allowsVideo: boolean;
};

type PendingUpload = {
  localId: string;
  previewUrl: string | null;
  status: "uploading" | "error";
  error: string | null;
};

function photoUrl(eventId: string, photoId: string, variant?: "thumb") {
  const base = `/api/events/${eventId}/album/${photoId}/file`;
  return variant ? `${base}?variant=${variant}` : base;
}

function albumTimestamp(value: string) {
  const iso = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function fileLabel(photo: AlbumPhoto) {
  const who = displayName(photo).replace(/[^\p{L}\p{N}._-]+/gu, "_").slice(0, 24) || "photo";
  return `${who}-${photo.id.slice(0, 6)}`;
}

async function runPool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const item = items[cursor];
      cursor += 1;
      if (item) await worker(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
}

export function EventAlbumPanel({
  eventId,
  eventTitle,
  currentUserId,
  canModerate = false,
  online = true,
}: {
  eventId: string;
  eventTitle: string;
  currentUserId: string;
  canModerate?: boolean;
  online?: boolean;
}) {
  const t = useTranslations("events.album");
  const format = useFormatter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [album, setAlbum] = useState<AlbumPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState<string | null>(null);
  const stopUploads = useRef(false);

  const load = useCallback(async () => {
    if (!online) {
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(`/api/events/${eventId}/album`);
      if (!response.ok) return;
      setAlbum((await response.json()) as AlbumPayload);
    } finally {
      setLoading(false);
    }
  }, [eventId, online]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (activeId && !dialog.open) dialog.showModal();
    if (!activeId && dialog.open) dialog.close();
  }, [activeId]);

  const photos = album?.photos ?? [];
  const limit = album?.limit ?? 20;
  const remaining = Math.max(0, limit - photos.length - pending.filter((item) => item.status === "uploading").length);
  const others = photos.filter((photo) => photo.user_id !== currentUserId);
  const activeIndex = photos.findIndex((photo) => photo.id === activeId);
  const active = activeIndex >= 0 ? photos[activeIndex] : null;
  const activeWhen = active ? albumTimestamp(active.created_at) : null;

  function errorText(code: string) {
    if (code === "album_full") return t("full", { limit });
    if (code === "video_unavailable") return t("videoLater");
    if (code === "too_large") return t("tooLarge");
    if (code === "unreadable" || code === "not_image") return t("notImage");
    return t("uploadError");
  }

  async function uploadOne(file: File, localId: string) {
    if (stopUploads.current) {
      setPending((current) =>
        current.map((item) =>
          item.localId === localId
            ? { ...item, status: "error", error: t("full", { limit }) }
            : item,
        ),
      );
      return false;
    }

    if (file.type.startsWith("video/")) {
      setPending((current) =>
        current.map((item) =>
          item.localId === localId
            ? { ...item, status: "error", error: t("videoLater") }
            : item,
        ),
      );
      return false;
    }

    try {
      const prepared = await prepareAlbumUpload(file);
      const form = new FormData();
      form.set("photo", prepared.full, prepared.optimized ? "photo.webp" : file.name || "photo");
      if (prepared.thumb) form.set("thumb", prepared.thumb, "thumb.webp");
      form.set("optimized", prepared.optimized ? "1" : "0");
      form.set("width", String(prepared.width));
      form.set("height", String(prepared.height));

      const response = await fetch(`/api/events/${eventId}/album`, { method: "POST", body: form });
      const body = (await response.json().catch(() => null)) as
        | { error?: string; photo?: AlbumPhoto }
        | null;

      if (!response.ok || !body || !("photo" in body) || !body.photo) {
        const code = body && "error" in body && body.error ? body.error : "uploadError";
        if (code === "album_full") stopUploads.current = true;
        setPending((current) =>
          current.map((item) =>
            item.localId === localId
              ? { ...item, status: "error", error: errorText(code) }
              : item,
          ),
        );
        return false;
      }

      const photo = body.photo;
      setAlbum((current) => {
        if (!current) return current;
        if (current.photos.some((item) => item.id === photo.id)) return current;
        const nextPhotos = [...current.photos, photo];
        return {
          ...current,
          photos: nextPhotos,
          count: nextPhotos.length,
          remaining: Math.max(0, current.limit - nextPhotos.length),
        };
      });
      setPending((current) => {
        const match = current.find((item) => item.localId === localId);
        if (match?.previewUrl) URL.revokeObjectURL(match.previewUrl);
        return current.filter((item) => item.localId !== localId);
      });
      return true;
    } catch {
      setPending((current) =>
        current.map((item) =>
          item.localId === localId
            ? { ...item, status: "error", error: t("uploadError") }
            : item,
        ),
      );
      return false;
    }
  }

  async function addFiles(list: File[]) {
    if (!online || !album || list.length === 0) return;
    setBanner(null);
    const videos = list.filter((file) => file.type.startsWith("video/"));
    const images = list.filter((file) => !file.type.startsWith("video/"));
    const slots = Math.max(
      0,
      limit - photos.length - pending.filter((item) => item.status === "uploading").length,
    );
    const accepted = images.slice(0, slots);
    const skipped = images.length - accepted.length;

    if (videos.length > 0) setBanner(t("videoLater"));
    else if (slots <= 0) setBanner(t("full", { limit }));
    else if (skipped > 0) setBanner(t("limitReached", { count: slots }));

    if (accepted.length === 0) return;

    stopUploads.current = false;
    const queued = accepted.map((file) => ({
      localId: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setPending((current) => [
      ...current.filter((item) => item.status === "uploading"),
      ...queued.map((item) => ({
        localId: item.localId,
        previewUrl: item.previewUrl,
        status: "uploading" as const,
        error: null,
      })),
    ]);

    let saved = 0;
    await runPool(queued, 2, async (item) => {
      const ok = await uploadOne(item.file, item.localId);
      if (ok) saved += 1;
    });

    if (saved > 0) {
      void fetch(`/api/events/${eventId}/album/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: saved }),
      });
    }
  }

  async function saveOthers() {
    if (others.length === 0 || saving) return;
    setSaving(true);
    setBanner(null);
    setSaveProgress(t("saving", { done: 0, total: others.length }));
    try {
      const result = await saveSharedPhotos({
        eventTitle,
        photos: others.map((photo) => ({
          id: photo.id,
          url: photoUrl(eventId, photo.id),
          name: fileLabel(photo),
        })),
        onProgress: (done, total) => setSaveProgress(t("saving", { done, total })),
      });
      setSaveProgress(result === "cancelled" ? null : t("saved"));
      if (result !== "cancelled") {
        window.setTimeout(() => setSaveProgress(null), 2500);
      }
    } catch {
      setSaveProgress(null);
      setBanner(t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  async function removeActive() {
    if (!active) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/events/${eventId}/album/${active.id}`, { method: "DELETE" });
      if (!response.ok) {
        setBanner(t("deleteError"));
        return;
      }
      setAlbum((current) => {
        if (!current) return current;
        const nextPhotos = current.photos.filter((photo) => photo.id !== active.id);
        return {
          ...current,
          photos: nextPhotos,
          count: nextPhotos.length,
          remaining: Math.max(0, current.limit - nextPhotos.length),
        };
      });
      setActiveId(null);
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  function openAt(index: number) {
    const photo = photos[index];
    if (!photo) return;
    setConfirmDelete(false);
    setActiveId(photo.id);
  }

  const canDeleteActive = Boolean(
    active && (active.user_id === currentUserId || canModerate),
  );

  return (
    <section id="event-album" className="kk-card scroll-mt-6 space-y-4 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 className="text-lg font-semibold">{t("title")}</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("subtitle")}</p>
        </div>
        <p className="shrink-0 rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
          {t("count", { count: photos.length, limit })}
        </p>
      </div>

      {!online ? <p className="text-sm text-zinc-500">{t("offline")}</p> : null}

      {online && loading ? (
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 sm:gap-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="aspect-square animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800"
            />
          ))}
        </div>
      ) : null}

      {online && !loading && photos.length === 0 && pending.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 px-4 py-8 text-center dark:border-zinc-700">
          <p className="font-medium">{t("emptyTitle")}</p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t("emptyBody")}</p>
        </div>
      ) : null}

      {photos.length > 0 || pending.length > 0 ? (
        <ul className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 sm:gap-2">
          {photos.map((photo, index) => (
            <li key={photo.id}>
              <button
                type="button"
                onClick={() => openAt(index)}
                className="group relative aspect-square w-full overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800"
              >
                {/* Auth-gated album files are served from our API, not the image optimizer. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoUrl(eventId, photo.id, "thumb")}
                  alt={t("uploadedBy", { name: displayName(photo) })}
                  className="h-full w-full object-cover"
                />
                <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-6 text-left text-xs text-white opacity-0 transition group-hover:opacity-100">
                  {displayName(photo)}
                </span>
              </button>
            </li>
          ))}
          {pending.map((item) => (
            <li key={item.localId} className="relative aspect-square overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
              {item.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.previewUrl} alt="" className="h-full w-full object-cover opacity-70" />
              ) : null}
              <span className="absolute inset-0 flex items-end bg-black/25 p-2 text-left text-xs font-medium text-white">
                {item.status === "uploading" ? t("uploading") : item.error}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {banner ? <p className="text-sm text-red-600 dark:text-red-400">{banner}</p> : null}
      {album && album.remaining <= 0 && pending.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("proHint")}</p>
      ) : null}

      <div
        className={`flex flex-col gap-2 rounded-2xl border border-dashed p-3 sm:flex-row sm:items-center ${
          dragging
            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
            : "border-transparent"
        }`}
        onDragOver={(event) => {
          if (!online || remaining <= 0) return;
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void addFiles(Array.from(event.dataTransfer.files));
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={album?.allowsVideo ? "image/*,video/*,.heic,.heif" : "image/*,.heic,.heif"}
          multiple
          className="sr-only"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            void addFiles(files);
          }}
        />
        {online && album && remaining > 0 ? (
          <button
            type="button"
            className={others.length > 0 ? "kk-btn-secondary" : "kk-btn-primary"}
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus className="h-4 w-4" />
            {t("add")}
          </button>
        ) : null}
        {others.length > 0 ? (
          <button
            type="button"
            className="kk-btn-primary"
            disabled={!online || saving}
            onClick={() => void saveOthers()}
          >
            <Download className="h-4 w-4" />
            {saving
              ? saveProgress ?? t("saving", { done: 0, total: others.length })
              : saveProgress ?? t("saveOthers")}
          </button>
        ) : photos.length > 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("saveEmpty")}</p>
        ) : null}
        {dragging ? <span className="text-sm text-emerald-700 dark:text-emerald-300">{t("drop")}</span> : null}
      </div>

      <dialog
        ref={dialogRef}
        className="w-[min(100vw-1.5rem,56rem)] max-w-none rounded-2xl border-0 bg-zinc-950 p-3 text-white backdrop:bg-black/75"
        onClose={() => {
          setActiveId(null);
          setConfirmDelete(false);
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") openAt(activeIndex + 1);
          if (event.key === "ArrowLeft") openAt(activeIndex - 1);
        }}
      >
        {active ? (
          <div className="space-y-3">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoUrl(eventId, active.id)}
                alt={t("uploadedBy", { name: displayName(active) })}
                className="max-h-[75dvh] w-full rounded-xl object-contain"
              />
              {activeIndex > 0 ? (
                <button
                  type="button"
                  className="absolute left-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/60"
                  onClick={() => openAt(activeIndex - 1)}
                  aria-label={t("previous")}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              ) : null}
              {activeIndex < photos.length - 1 ? (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/60"
                  onClick={() => openAt(activeIndex + 1)}
                  aria-label={t("next")}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <div>
                <p className="font-medium">{displayName(active)}</p>
                <p className="text-zinc-400">
                  {activeWhen
                    ? format.dateTime(activeWhen, { dateStyle: "medium", timeStyle: "short" })
                    : null}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {canDeleteActive ? (
                  confirmDelete ? (
                    <>
                      <button
                        type="button"
                        disabled={deleting}
                        onClick={() => void removeActive()}
                        className="font-medium text-red-300"
                      >
                        {deleting ? t("deleting") : t("confirmDelete")}
                      </button>
                      <button type="button" onClick={() => setConfirmDelete(false)} className="text-zinc-300">
                        {t("cancelDelete")}
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => setConfirmDelete(true)} className="text-zinc-300">
                      {t("delete")}
                    </button>
                  )
                ) : null}
                <button
                  type="button"
                  onClick={() => dialogRef.current?.close()}
                  className="grid h-10 w-10 place-items-center rounded-full bg-white/10"
                  aria-label={t("close")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </dialog>
    </section>
  );
}
