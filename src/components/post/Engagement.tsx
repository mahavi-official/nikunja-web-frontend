"use client";

import { useState } from "react";
import { Heart, Loader2, LogIn, MessageCircle, Trash2 } from "lucide-react";
import { authedFetch, useAuth } from "@/components/providers/AuthProvider";
import { Button, buttonClass } from "@/components/ui/primitives";
import { cn, formatDate } from "@/lib/format";
import type { Comment } from "@/lib/types";

/**
 * Likes and comments. Browsing never requires an account; acting does.
 *
 * The initial comment list is server-rendered by the page (so it is indexable
 * and there is no loading flash) and handed in here as `initialComments`;
 * everything after that is client state.
 */
export function Engagement({
  postId,
  commentsEnabled,
  initialComments,
  totalComments,
}: {
  postId: string;
  commentsEnabled: boolean;
  initialComments: Comment[];
  totalComments: number;
}) {
  const { user, loading, signIn, getToken } = useAuth();
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState<number | null>(null);
  const [liking, setLiking] = useState(false);

  const toggleLike = async () => {
    if (!user) return signIn();
    setLiking(true);
    setError(null);
    try {
      const response = await authedFetch(getToken, `/me/posts/${postId}/like`, {
        method: liked ? "DELETE" : "POST",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message ?? "Could not register that.");
      setLiked(Boolean(payload.data?.liked));
      setLikeCount(typeof payload.data?.count === "number" ? payload.data.count : null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not register that.");
    } finally {
      setLiking(false);
    }
  };

  const submitComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return signIn();
    if (!body.trim()) return;

    setPosting(true);
    setError(null);
    try {
      const response = await authedFetch(getToken, "/me/comments", {
        method: "POST",
        body: JSON.stringify({ postId, body: body.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message ?? "Could not post that comment.");
      setComments((current) => [payload.data as Comment, ...current]);
      setBody("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not post that comment.");
    } finally {
      setPosting(false);
    }
  };

  const removeComment = async (id: string) => {
    const previous = comments;
    setComments((current) => current.filter((comment) => comment.id !== id));
    try {
      const response = await authedFetch(getToken, `/me/comments/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
    } catch {
      setComments(previous);
      setError("Could not delete that comment.");
    }
  };

  return (
    <section aria-labelledby="responses" className="mt-16 border-t border-line pt-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h2 id="responses" className="text-xl">
          Responses
        </h2>

        <button
          type="button"
          onClick={toggleLike}
          disabled={liking || loading}
          aria-pressed={liked}
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
            liked
              ? "border-flame-500 bg-flame-50 text-flame-700 dark:bg-flame-900/30 dark:text-flame-200"
              : "border-line-strong text-ink-soft hover:border-flame-400 hover:text-flame-600"
          )}
        >
          {liking ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Heart className={cn("size-4", liked && "fill-current")} aria-hidden />
          )}
          {liked ? "Liked" : "Like"}
          {likeCount !== null ? <span className="tabular-nums">{likeCount}</span> : null}
        </button>
      </div>

      {commentsEnabled ? (
        user ? (
          <form onSubmit={submitComment} className="mb-10">
            <label htmlFor="comment-body" className="sr-only">
              Your response
            </label>
            <textarea
              id="comment-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={5000}
              rows={4}
              placeholder={`Writing as ${user.name}…`}
              className="w-full resize-y rounded-[var(--radius-card)] border border-line-strong bg-surface-raised p-4 text-[0.9375rem] outline-none transition-colors focus:border-flame-400"
            />
            <div className="mt-3 flex items-center justify-between gap-4">
              <span className="text-xs text-ink-muted">{body.length}/5000</span>
              <Button type="submit" size="sm" disabled={posting || !body.trim()}>
                {posting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                Post response
              </Button>
            </div>
          </form>
        ) : (
          <div className="mb-10 flex flex-col items-start gap-3 rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface-raised/60 p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink-soft">
              Sign in with Google to leave a response. Reading never requires an account.
            </p>
            <button type="button" onClick={() => signIn()} className={buttonClass("secondary", "sm")}>
              <LogIn className="size-4" aria-hidden />
              Sign in
            </button>
          </div>
        )
      ) : (
        <p className="mb-10 text-sm text-ink-muted">Responses are closed on this piece.</p>
      )}

      {error ? (
        <p role="alert" className="mb-6 text-sm text-flame-700 dark:text-flame-300">
          {error}
        </p>
      ) : null}

      {comments.length ? (
        <ul className="space-y-6">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-navy-100 text-sm font-semibold text-navy-700 dark:bg-navy-800 dark:text-navy-100">
                {comment.user.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{comment.user.name}</span>
                  <time dateTime={comment.createdAt} className="text-xs text-ink-muted">
                    {formatDate(comment.createdAt)}
                  </time>
                  {user?.id === comment.userId ? (
                    <button
                      type="button"
                      onClick={() => removeComment(comment.id)}
                      aria-label="Delete your comment"
                      className="ml-auto text-ink-muted transition-colors hover:text-flame-600"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  ) : null}
                </div>
                <p className="mt-1.5 text-[0.9375rem] leading-relaxed whitespace-pre-line text-ink-soft">
                  {comment.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="flex items-center gap-2 text-sm text-ink-muted">
          <MessageCircle className="size-4" aria-hidden />
          No responses yet.
        </p>
      )}

      {totalComments > comments.length ? (
        <p className="mt-6 text-sm text-ink-muted">
          Showing {comments.length} of {totalComments} responses.
        </p>
      ) : null}
    </section>
  );
}
