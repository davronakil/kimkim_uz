"use client";

import { MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import type { Comment } from "@/types";
import { displayName } from "@/lib/utils";

function CommentItem({
  comment,
  eventId,
  currentUserId,
  depth = 0,
  onPosted,
  readOnly = false,
}: {
  comment: Comment & { replies?: Comment[] };
  eventId: string;
  currentUserId?: string;
  depth?: number;
  onPosted: () => void;
  readOnly?: boolean;
}) {
  const t = useTranslations("events.comments");
  const [replying, setReplying] = useState(false);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const canDelete = !readOnly && currentUserId && comment.user_id === currentUserId;

  async function submit(parentId?: string) {
    setSubmitting(true);
    await fetch(`/api/events/${eventId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, parent_id: parentId }),
    });
    setSubmitting(false);
    setBody("");
    setReplying(false);
    onPosted();
  }

  async function remove() {
    setDeleting(true);
    setDeleteError(null);
    const response = await fetch(`/api/events/${eventId}/comments/${comment.id}`, {
      method: "DELETE",
    });
    setDeleting(false);

    if (response.status === 409) {
      setDeleteError(t("deleteHasReplies"));
      return;
    }

    if (response.ok) {
      setConfirmDelete(false);
      onPosted();
      return;
    }

    setDeleteError(t("deleteError"));
  }

  return (
    <div
      className={
        depth > 0
          ? "ml-2 border-l-2 border-zinc-200 pl-3 sm:ml-4 sm:border-l sm:pl-4 dark:border-zinc-700"
          : ""
      }
    >
      <article className="kk-card p-4 sm:p-5">
        <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
          <p className="text-base font-semibold sm:text-sm">
            {comment.user ? displayName(comment.user) : "User"}
          </p>
          <time className="text-sm text-zinc-500 sm:text-xs">
            {new Date(comment.created_at).toLocaleString()}
          </time>
        </div>
        <p className="whitespace-pre-wrap text-base leading-relaxed text-zinc-700 sm:text-sm dark:text-zinc-200">
          {comment.body}
        </p>
        {deleteError ? (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{deleteError}</p>
        ) : null}
        {!readOnly ? (
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setReplying((value) => !value)}
              className="min-h-11 text-sm font-medium text-emerald-600 hover:text-emerald-700 sm:min-h-0"
            >
              {t("reply")}
            </button>
            {canDelete ? (
              confirmDelete ? (
                <>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => void remove()}
                    className="min-h-11 text-sm font-medium text-red-600 hover:text-red-700 sm:min-h-0"
                  >
                    {deleting ? t("deleting") : t("confirmDelete")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="min-h-11 text-sm font-medium text-zinc-500 sm:min-h-0"
                  >
                    {t("cancelDelete")}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="min-h-11 text-sm font-medium text-zinc-500 hover:text-red-600 sm:min-h-0"
                >
                  {t("delete")}
                </button>
              )
            ) : null}
          </div>
        ) : null}
        {replying && !readOnly ? (
          <div className="mt-3 space-y-3">
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={t("placeholder")}
              rows={3}
              className="kk-textarea"
            />
            <button
              type="button"
              disabled={submitting || !body.trim()}
              onClick={() => submit(comment.id)}
              className="kk-btn-primary w-full sm:w-auto"
            >
              {t("post")}
            </button>
          </div>
        ) : null}
      </article>

      {comment.replies?.map((reply) => (
        <div key={reply.id} className="mt-3">
          <CommentItem
            comment={reply}
            eventId={eventId}
            currentUserId={currentUserId}
            depth={depth + 1}
            onPosted={onPosted}
            readOnly={readOnly}
          />
        </div>
      ))}
    </div>
  );
}

export function CommentThread({
  eventId,
  comments,
  currentUserId,
  onPosted,
  readOnly = false,
}: {
  eventId: string;
  comments: Comment[];
  currentUserId?: string;
  onPosted: () => void;
  readOnly?: boolean;
}) {
  const t = useTranslations("events.comments");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitRoot() {
    setSubmitting(true);
    await fetch(`/api/events/${eventId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    setSubmitting(false);
    setBody("");
    onPosted();
  }

  return (
    <div className="space-y-4">
      {!readOnly ? (
        <div className="kk-card space-y-3 p-4 sm:p-5">
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={t("placeholder")}
            rows={4}
            className="kk-textarea"
          />
          <button
            type="button"
            disabled={submitting || !body.trim()}
            onClick={submitRoot}
            className="kk-btn-primary w-full sm:w-auto"
          >
            {t("post")}
          </button>
        </div>
      ) : null}

      {comments.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title={t("emptyTitle")}
          description={t("empty")}
        />
      ) : (
        comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            eventId={eventId}
            currentUserId={currentUserId}
            onPosted={onPosted}
            readOnly={readOnly}
          />
        ))
      )}
    </div>
  );
}
