"use client";

import { useContext, useEffect, useMemo, useState } from "react";
import { getSessionToken } from "../../lib/auth/session-store";
import { AppContext } from "../../providers/app-provider";
import {
  buildReplyInput,
  createSocialComment,
  fetchSocialComments,
  toggleSocialReaction,
} from "./api";
import {
  SOCIAL_REACTION_TYPES,
  reactionLabel,
  type SocialCommentNode,
  type SocialCommentScope,
  type SocialReactionType,
} from "./types";

interface SocialThreadProps {
  title: string;
  scope: SocialCommentScope;
  emptyHint: string;
}

interface ReactionState {
  type: SocialReactionType | null;
  message: string | null;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return date.toLocaleString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function authorName(node: SocialCommentNode) {
  return node.author.nickname ?? "Reader #" + node.author.id;
}

function isNovelScope(scope: SocialCommentScope): scope is { novelId: number; chapterId?: never } {
  return "novelId" in scope;
}

export function SocialThread({ title, scope, emptyHint }: SocialThreadProps) {
  const { user } = useContext(AppContext);
  const [comments, setComments] = useState<SocialCommentNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rootDraft, setRootDraft] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [replyStatus, setReplyStatus] = useState<string | null>(null);
  const [reactionState, setReactionState] = useState<Record<number, ReactionState>>({});
  const [pendingReactionId, setPendingReactionId] = useState<number | null>(null);

  const novelId = isNovelScope(scope) ? scope.novelId : undefined;
  const chapterId = isNovelScope(scope) ? undefined : scope.chapterId;

  const normalizedScope = useMemo<SocialCommentScope>(() => {
    if (novelId !== undefined) {
      return { novelId };
    }

    return { chapterId: chapterId as number };
  }, [novelId, chapterId]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    void (async () => {
      const response = await fetchSocialComments(normalizedScope, controller.signal);
      if (controller.signal.aborted) {
        return;
      }

      if (!response.ok) {
        setComments([]);
        setError(response.error.message);
        setLoading(false);
        return;
      }

      setComments(response.data);
      setLoading(false);
    })();

    return () => controller.abort();
  }, [normalizedScope]);

  async function refreshComments() {
    const response = await fetchSocialComments(normalizedScope);
    if (!response.ok) {
      setError(response.error.message);
      return;
    }

    setComments(response.data);
    setError(null);
  }

  async function submitRootComment() {
    const token = getSessionToken() ?? undefined;
    if (!token || !user) {
      setStatus("Sign in to post comments.");
      return;
    }

    setSubmitting(true);
    setStatus(null);

    const input = isNovelScope(normalizedScope)
      ? { content: rootDraft, novelId: normalizedScope.novelId }
      : { content: rootDraft, chapterId: normalizedScope.chapterId };

    const response = await createSocialComment(input, token);
    if (!response.ok) {
      setStatus(response.error.message);
      setSubmitting(false);
      return;
    }

    setRootDraft("");
    setStatus("Comment posted.");
    setSubmitting(false);
    await refreshComments();
  }

  async function submitReply(parentId: number) {
    const token = getSessionToken() ?? undefined;
    if (!token || !user) {
      setReplyStatus("Sign in to post replies.");
      return;
    }

    setSubmitting(true);
    setReplyStatus(null);

    const response = await createSocialComment(buildReplyInput(parentId, replyDraft, normalizedScope), token);
    if (!response.ok) {
      setReplyStatus(response.error.message);
      setSubmitting(false);
      return;
    }

    setReplyDraft("");
    setReplyingTo(null);
    setReplyStatus("Reply posted.");
    setSubmitting(false);
    await refreshComments();
  }

  async function onReaction(commentId: number, type: SocialReactionType) {
    const token = getSessionToken() ?? undefined;
    if (!token || !user) {
      setReactionState((current) => ({
        ...current,
        [commentId]: {
          type: current[commentId]?.type ?? null,
          message: "Sign in to react.",
        },
      }));
      return;
    }

    setPendingReactionId(commentId);

    const response = await toggleSocialReaction({ commentId, type }, token);
    if (!response.ok) {
      setReactionState((current) => ({
        ...current,
        [commentId]: {
          type: current[commentId]?.type ?? null,
          message: response.error.message,
        },
      }));
      setPendingReactionId(null);
      return;
    }

    setReactionState((current) => ({
      ...current,
      [commentId]: {
        type: response.data?.type ?? null,
        message: response.data ? "Reaction updated." : "Reaction removed.",
      },
    }));
    setPendingReactionId(null);
  }

  function renderComment(node: SocialCommentNode, depth: number) {
    const currentReaction = reactionState[node.id]?.type ?? null;
    const currentMessage = reactionState[node.id]?.message;

    return (
      <li key={node.id} className="social-comment" style={{ marginLeft: String(Math.min(depth, 4) * 16) + "px" }}>
        <div className="social-comment__header">
          <strong>{authorName(node)}</strong>
          <span>
            {node.author.role} · {formatDate(node.createdAt)}
          </span>
        </div>

        <p className="social-comment__content">{node.content}</p>

        <div className="social-comment__actions">
          <button
            type="button"
            className="action-secondary social-reply-toggle"
            onClick={() => {
              setReplyingTo((current) => (current === node.id ? null : node.id));
              setReplyStatus(null);
              setReplyDraft("");
            }}
          >
            {replyingTo === node.id ? "Cancel reply" : "Reply"}
          </button>

          <div className="social-reaction-row" aria-label="Comment reactions">
            {SOCIAL_REACTION_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className={
                  "social-reaction-button" +
                  (currentReaction === type ? " social-reaction-button--active" : "")
                }
                onClick={() => void onReaction(node.id, type)}
                disabled={pendingReactionId === node.id}
              >
                {reactionLabel(type)}
              </button>
            ))}
          </div>
        </div>

        {currentMessage ? <p className="social-inline-status">{currentMessage}</p> : null}

        {replyingTo === node.id ? (
          <div className="social-reply-box">
            <textarea
              value={replyDraft}
              onChange={(event) => setReplyDraft(event.target.value)}
              placeholder="Write a reply"
              rows={3}
              maxLength={2000}
            />
            <div className="social-form-footer">
              <span>{replyDraft.trim().length}/2000</span>
              <button className="action-primary" type="button" onClick={() => void submitReply(node.id)} disabled={submitting}>
                {submitting ? "Posting..." : "Post reply"}
              </button>
            </div>
            {replyStatus ? <p className="social-inline-status">{replyStatus}</p> : null}
          </div>
        ) : null}

        {node.replies.length > 0 ? (
          <ul className="social-reply-list">{node.replies.map((child) => renderComment(child, depth + 1))}</ul>
        ) : null}
      </li>
    );
  }

  return (
    <section className="reader-card social-card">
      <div className="reader-card__header">
        <span className="home-kicker">Social Interaction</span>
        <h2>{title}</h2>
        <p>Nested comments and reactions are synced through the social API.</p>
      </div>

      <div className="social-create-box">
        <textarea
          value={rootDraft}
          onChange={(event) => setRootDraft(event.target.value)}
          placeholder={user ? "Share your thoughts" : "Sign in to join the discussion"}
          rows={4}
          maxLength={2000}
        />
        <div className="social-form-footer">
          <span>{rootDraft.trim().length}/2000</span>
          <button className="action-primary" type="button" onClick={() => void submitRootComment()} disabled={submitting}>
            {submitting ? "Posting..." : "Post comment"}
          </button>
        </div>
        {status ? <p className="social-inline-status">{status}</p> : null}
      </div>

      {loading ? <p className="discovery-state">Loading discussion...</p> : null}
      {error ? <p className="discovery-state discovery-state--error">{error}</p> : null}
      {!loading && !error && comments.length === 0 ? <p className="reader-muted">{emptyHint}</p> : null}
      {comments.length > 0 ? <ul className="social-comment-list">{comments.map((node) => renderComment(node, 0))}</ul> : null}
    </section>
  );
}
