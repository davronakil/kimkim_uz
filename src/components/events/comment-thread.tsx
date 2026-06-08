"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import type { Comment } from "@/types";
import { displayName } from "@/lib/utils";

function CommentItem({
  comment,
  eventId,
  depth = 0,
  onPosted,
}: {
  comment: Comment & { replies?: Comment[] };
  eventId: string;
  depth?: number;
  onPosted: () => void;
}) {
  const t = useTranslations("events.comments");
  const [replying, setReplying] = useState(false);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  return (
    <div className={depth > 0 ? "ml-4 border-l border-zinc-200 pl-4 dark:border-zinc-700" : ""}>
      <article className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-medium">
            {comment.user ? displayName(comment.user) : "User"}
          </p>
          <time className="text-xs text-zinc-500">
            {new Date(comment.created_at).toLocaleString()}
          </time>
        </div>
        <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-200">{comment.body}</p>
        <button
          type="button"
          onClick={() => setReplying((value) => !value)}
          className="mt-3 text-xs font-medium text-emerald-600 hover:text-emerald-700"
        >
          {t("reply")}
        </button>
        {replying ? (
          <div className="mt-3 space-y-2">
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={t("placeholder")}
              rows={3}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
            <button
              type="button"
              disabled={submitting || !body.trim()}
              onClick={() => submit(comment.id)}
              className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-medium text-white disabled:opacity-60"
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
            depth={depth + 1}
            onPosted={onPosted}
          />
        </div>
      ))}
    </div>
  );
}

export function CommentThread({
  eventId,
  comments,
  onPosted,
}: {
  eventId: string;
  comments: Comment[];
  onPosted: () => void;
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
      <div className="space-y-2 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={t("placeholder")}
          rows={4}
          className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
        <button
          type="button"
          disabled={submitting || !body.trim()}
          onClick={submitRoot}
          className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {t("post")}
        </button>
      </div>

      {comments.length === 0 ? (
        <p className="text-sm text-zinc-500">{t("empty")}</p>
      ) : (
        comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            eventId={eventId}
            onPosted={onPosted}
          />
        ))
      )}
    </div>
  );
}
