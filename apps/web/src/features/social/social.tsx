"use client";

import {
  ChevronDown,
  Film,
  MessageSquareReply,
  SendHorizontal,
  SmilePlus,
  ThumbsUp,
  X,
} from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getSessionToken } from "../../lib/auth/session-store";
import { resolveImageUrl } from "../../lib/image";
import { AppContext } from "../../providers/app-provider";
import {
  buildReplyInput,
  createSocialComment,
  fetchSocialComments,
  toggleSocialReaction,
} from "./api";
import { EmojiPicker } from "./emoji-picker";
import { GifPicker } from "./gif-picker";
import {
  SOCIAL_REACTION_TYPES,
  type CommentAttachment,
  type SocialCommentNode,
  type SocialCommentScope,
  type SocialReactionType,
} from "./types";

interface SocialThreadProps {
  title: string;
  scope: SocialCommentScope;
  emptyHint: string;
  variant?: "card" | "embedded";
  hideHeader?: boolean;
}

const QUICK_EMOJI_PRESETS = ["🥹", "😂", "😍", "🔥", "👏", "💯"] as const;

const REACTION_META: Record<
  SocialReactionType,
  { emoji: string; vi: string; en: string }
> = {
  LIKE: { emoji: "👍", vi: "Thích", en: "Like" },
  HEART: { emoji: "❤️", vi: "Yêu thích", en: "Love" },
  HAHA: { emoji: "😂", vi: "Haha", en: "Haha" },
  WOW: { emoji: "😮", vi: "Wow", en: "Wow" },
  SAD: { emoji: "😢", vi: "Buồn", en: "Sad" },
  ANGRY: { emoji: "😡", vi: "Giận", en: "Angry" },
};

function formatRelativeDate(value: string, locale: "vi" | "en") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return locale === "vi" ? "Không rõ thời gian" : "Unknown time";
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60_000));
  const diffHours = Math.max(0, Math.floor(diffMs / 3_600_000));
  const diffDays = Math.max(0, Math.floor(diffMs / 86_400_000));

  if (diffMinutes < 1) return locale === "vi" ? "Vừa xong" : "Just now";
  if (diffMinutes < 60)
    return locale === "vi"
      ? `${diffMinutes} phút trước`
      : `${diffMinutes} minutes ago`;
  if (diffHours < 24)
    return locale === "vi"
      ? `${diffHours} giờ trước`
      : `${diffHours} hours ago`;
  if (diffDays < 7)
    return locale === "vi" ? `${diffDays} ngày trước` : `${diffDays} days ago`;

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5)
    return locale === "vi"
      ? `${diffWeeks} tuần trước`
      : `${diffWeeks} weeks ago`;

  return date.toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function authorName(node: SocialCommentNode) {
  return node.author.nickname?.trim() || "Reader #" + node.author.id;
}

function authorInitials(node: SocialCommentNode) {
  const value = authorName(node)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return value || "U";
}

function isNovelScope(
  scope: SocialCommentScope,
): scope is { novelId: number; chapterId?: never } {
  return "novelId" in scope;
}

function getReactionLabel(type: SocialReactionType, locale: "vi" | "en") {
  const meta = REACTION_META[type];
  return locale === "vi" ? meta.vi : meta.en;
}

function getReactionEmoji(type: SocialReactionType) {
  return REACTION_META[type].emoji;
}

function getCommentReactionCount(node: SocialCommentNode, type: SocialReactionType) {
  return node.reactions.find((item) => item.type === type)?.count ?? 0;
}

function appendQuickEmoji(current: string, emoji: string) {
  const trimmedEnd = current.trimEnd();
  if (!trimmedEnd) return emoji + " ";
  return trimmedEnd + " " + emoji + " ";
}

// --- Floating picker wrapper (closes on outside click / Escape) ---
function FloatingPicker({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute bottom-full left-0 z-50 mb-1">
      {children}
    </div>
  );
}

// --- Attachment preview strip (in the compose box) ---
function AttachmentStrip({
  attachment,
  onRemove,
}: {
  attachment: CommentAttachment;
  onRemove: () => void;
}) {
  return (
    <div className="relative mt-2 inline-block">
      <img
        src={attachment.preview}
        alt={attachment.alt ?? "attachment"}
        width={attachment.width}
        height={attachment.height}
        className="max-h-28 w-auto border border-border object-contain"
        style={{ aspectRatio: `${attachment.width}/${attachment.height}` }}
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove attachment"
        className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center border border-border bg-background shadow-sm hover:bg-muted"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

// --- GIF display inside a rendered comment ---
function CommentGif({ attachment }: { attachment: CommentAttachment }) {
  const maxW = Math.min(attachment.width, 320);
  const maxH = Math.round((maxW / attachment.width) * attachment.height);

  return (
    <div
      className="overflow-hidden border border-border bg-muted"
      style={{ width: maxW, height: maxH }}
    >
      <img
        src={attachment.url}
        alt={attachment.alt ?? "GIF"}
        width={maxW}
        height={maxH}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
      />
    </div>
  );
}

export function SocialThread({
  title,
  scope,
  emptyHint,
  variant = "card",
  hideHeader = false,
}: SocialThreadProps) {
  const { locale, user } = useContext(AppContext);

  const copy =
    locale === "vi"
      ? {
          socialInteraction: "Bình luận",
          syncedHint:
            "Bình luận, phản hồi và cảm xúc được đồng bộ theo tài khoản của bạn.",
          signInToPost: "Đăng nhập để bình luận.",
          signInToReply: "Đăng nhập để trả lời.",
          signInToReact: "Đăng nhập để thả cảm xúc.",
          commentPosted: "Đã gửi bình luận.",
          replyPosted: "Đã gửi phản hồi.",
          reactionUpdated: "Đã cập nhật cảm xúc.",
          reactionRemoved: "Đã bỏ cảm xúc.",
          cancelReply: "Hủy trả lời",
          reply: "Trả lời",
          writeReply: "Viết phản hồi cho bình luận này",
          shareThoughts: "Chia sẻ cảm nhận của bạn về truyện",
          signInPlaceholder: "Đăng nhập để tham gia bình luận",
          postReply: "Gửi phản hồi",
          postComment: "Gửi",
          posting: "Đang gửi...",
          loading: "Đang tải bình luận...",
          like: "Thích",
          react: "Cảm xúc",
          reacted: "Đổi cảm xúc",
          quickEmoji: "Biểu cảm nhanh",
          replyCount: "phản hồi",
          youReacted: "Bạn đang chọn",
          adminRole: "Admin",
          authorRole: "Tác giả",
          noComments: "Chưa có bình luận nào.",
          addGif: "Thêm GIF",
          emoji: "Emoji",
          removeAttachment: "Xóa ảnh đính kèm",
        }
      : {
          socialInteraction: "Comments",
          syncedHint:
            "Comments, replies, and reactions stay synced to your account.",
          signInToPost: "Sign in to post comments.",
          signInToReply: "Sign in to post replies.",
          signInToReact: "Sign in to react.",
          commentPosted: "Comment posted.",
          replyPosted: "Reply posted.",
          reactionUpdated: "Reaction updated.",
          reactionRemoved: "Reaction removed.",
          cancelReply: "Cancel reply",
          reply: "Reply",
          writeReply: "Write a reply to this comment",
          shareThoughts: "Share your thoughts about this novel",
          signInPlaceholder: "Sign in to join the discussion",
          postReply: "Send reply",
          postComment: "Send",
          posting: "Posting...",
          loading: "Loading comments...",
          like: "Like",
          react: "React",
          reacted: "Change reaction",
          quickEmoji: "Quick emoji",
          replyCount: "replies",
          youReacted: "Your reaction",
          adminRole: "Admin",
          authorRole: "Author",
          noComments: "No comments yet.",
          addGif: "Add GIF",
          emoji: "Emoji",
          removeAttachment: "Remove attachment",
        };

  // ---- State ----
  const [comments, setComments] = useState<SocialCommentNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittingRoot, setSubmittingRoot] = useState(false);
  const [submittingReplyId, setSubmittingReplyId] = useState<number | null>(null);
  const [rootDraft, setRootDraft] = useState("");
  const [rootAttachments, setRootAttachments] = useState<CommentAttachment[]>([]);
  const [showRootEmoji, setShowRootEmoji] = useState(false);
  const [showRootGif, setShowRootGif] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [replyAttachments, setReplyAttachments] = useState<CommentAttachment[]>([]);
  const [showReplyEmoji, setShowReplyEmoji] = useState(false);
  const [showReplyGif, setShowReplyGif] = useState(false);
  const [replyStatus, setReplyStatus] = useState<string | null>(null);
  const [reactionFeedback, setReactionFeedback] = useState<
    Record<number, string | null>
  >({});

  const novelId = isNovelScope(scope) ? scope.novelId : undefined;
  const chapterId = isNovelScope(scope) ? undefined : scope.chapterId;

  const normalizedScope = useMemo<SocialCommentScope>(() => {
    if (novelId !== undefined) return { novelId };
    return { chapterId: chapterId as number };
  }, [novelId, chapterId]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    void (async () => {
      const response = await fetchSocialComments(
        normalizedScope,
        getSessionToken() ?? undefined,
        controller.signal,
      );
      if (controller.signal.aborted) return;

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
  }, [normalizedScope, user?.id]);

  async function refreshComments() {
    const response = await fetchSocialComments(
      normalizedScope,
      getSessionToken() ?? undefined,
    );
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
      setStatus(copy.signInToPost);
      return;
    }

    setSubmittingRoot(true);
    setStatus(null);

    const base = isNovelScope(normalizedScope)
      ? { content: rootDraft, novelId: normalizedScope.novelId }
      : { content: rootDraft, chapterId: normalizedScope.chapterId };

    const response = await createSocialComment(
      { ...base, attachments: rootAttachments },
      token,
    );

    if (!response.ok) {
      setStatus(response.error.message);
      setSubmittingRoot(false);
      return;
    }

    setRootDraft("");
    setRootAttachments([]);
    setStatus(copy.commentPosted);
    setSubmittingRoot(false);
    await refreshComments();
  }

  async function submitReply(parentId: number) {
    const token = getSessionToken() ?? undefined;
    if (!token || !user) {
      setReplyStatus(copy.signInToReply);
      return;
    }

    setSubmittingReplyId(parentId);
    setReplyStatus(null);

    const base = buildReplyInput(parentId, replyDraft, normalizedScope);
    const response = await createSocialComment(
      { ...base, attachments: replyAttachments },
      token,
    );

    if (!response.ok) {
      setReplyStatus(response.error.message);
      setSubmittingReplyId(null);
      return;
    }

    setReplyDraft("");
    setReplyAttachments([]);
    setReplyingTo(null);
    setReplyStatus(copy.replyPosted);
    setSubmittingReplyId(null);
    await refreshComments();
  }

  async function onReaction(commentId: number, type: SocialReactionType) {
    const token = getSessionToken() ?? undefined;
    if (!token || !user) {
      setReactionFeedback((cur) => ({ ...cur, [commentId]: copy.signInToReact }));
      return;
    }

    const response = await toggleSocialReaction({ commentId, type }, token);
    if (!response.ok) {
      setReactionFeedback((cur) => ({
        ...cur,
        [commentId]: response.error.message,
      }));
      return;
    }

    await refreshComments();
    setReactionFeedback((cur) => ({
      ...cur,
      [commentId]: response.data ? copy.reactionUpdated : copy.reactionRemoved,
    }));
  }

  const closeRootPickers = useCallback(() => {
    setShowRootEmoji(false);
    setShowRootGif(false);
  }, []);

  const closeReplyPickers = useCallback(() => {
    setShowReplyEmoji(false);
    setShowReplyGif(false);
  }, []);

  function renderRoleBadge(role: string) {
    if (role === "ADMIN") {
      return (
        <span className="inline-flex h-5 items-center border border-red-200 bg-red-50 px-1.5 text-[11px] font-semibold text-red-700">
          {copy.adminRole}
        </span>
      );
    }
    if (role === "AUTHOR") {
      return (
        <span className="inline-flex h-5 items-center border border-violet-200 bg-violet-50 px-1.5 text-[11px] font-semibold text-violet-700">
          {copy.authorRole}
        </span>
      );
    }
    return null;
  }

  // --- Compose toolbar: quick emojis + emoji picker + GIF picker buttons ---
  function renderToolbar(opts: {
    onEmoji: (e: string) => void;
    onAttachment: (a: CommentAttachment) => void;
    showEmoji: boolean;
    showGif: boolean;
    onToggleEmoji: () => void;
    onToggleGif: () => void;
    onClosePickers: () => void;
    compact?: boolean;
  }) {
    return (
      <div
        className={cn(
          "relative flex flex-wrap items-center gap-2 border-b border-border pb-3",
          opts.compact && "pb-2",
        )}
        aria-label={copy.quickEmoji}
      >
        {QUICK_EMOJI_PRESETS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className="inline-flex h-8 min-w-8 items-center justify-center border border-border bg-background px-2 text-base text-foreground transition-colors hover:bg-muted"
            onClick={() => opts.onEmoji(emoji)}
          >
            <span aria-hidden="true">{emoji}</span>
          </button>
        ))}

        {/* Full emoji picker toggle */}
        <button
          type="button"
          title={copy.emoji}
          aria-label={copy.emoji}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 border px-2 text-xs font-medium transition-colors",
            opts.showEmoji
              ? "border-violet-300 bg-violet-50 text-violet-700"
              : "border-border bg-background text-foreground hover:bg-muted",
          )}
          onClick={() => {
            opts.onToggleEmoji();
          }}
        >
          <SmilePlus className="h-3.5 w-3.5" />
        </button>

        {/* GIF picker toggle */}
        <button
          type="button"
          title={copy.addGif}
          aria-label={copy.addGif}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 border px-2 text-xs font-medium transition-colors",
            opts.showGif
              ? "border-violet-300 bg-violet-50 text-violet-700"
              : "border-border bg-background text-foreground hover:bg-muted",
          )}
          onClick={() => {
            opts.onToggleGif();
          }}
        >
          <Film className="h-3.5 w-3.5" />
          <span>GIF</span>
        </button>

        {opts.showEmoji && (
          <FloatingPicker onClose={opts.onClosePickers}>
            <EmojiPicker onSelect={(e) => { opts.onEmoji(e); opts.onClosePickers(); }} />
          </FloatingPicker>
        )}

        {opts.showGif && (
          <FloatingPicker onClose={opts.onClosePickers}>
            <GifPicker
              onSelect={(a) => { opts.onAttachment(a); opts.onClosePickers(); }}
              onClose={opts.onClosePickers}
            />
          </FloatingPicker>
        )}
      </div>
    );
  }

  function renderReactionSummary(node: SocialCommentNode) {
    if (node.reactionCount <= 0) return null;

    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-dashed border-border pt-2 text-xs text-muted-foreground">
        {node.reactions.slice(0, 4).map((reaction) => (
          <span key={reaction.type} className="inline-flex items-center gap-1">
            <span aria-hidden="true">{getReactionEmoji(reaction.type)}</span>
            <span>{reaction.count}</span>
          </span>
        ))}
        {node.viewerReaction ? (
          <span>
            {copy.youReacted}: {getReactionLabel(node.viewerReaction, locale)}
          </span>
        ) : null}
      </div>
    );
  }

  function renderCommentAttachments(node: SocialCommentNode) {
    const gifs = node.attachments?.filter((a) => a.type === "gif") ?? [];
    if (gifs.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-2">
        {gifs.map((att, i) => (
          <CommentGif key={i} attachment={att} />
        ))}
      </div>
    );
  }

  function renderComment(node: SocialCommentNode, depth: number) {
    const author = authorName(node);
    const avatarSrc = resolveImageUrl(node.author.avatar);
    const isReplyOpen = replyingTo === node.id;
    const likeCount = getCommentReactionCount(node, "LIKE");
    const feedback = reactionFeedback[node.id];

    return (
      <li key={node.id} className="space-y-3">
        <article
          className={cn(
            "border border-border bg-background shadow-sm",
            depth > 0 && "border-l-[3px] border-l-violet-200",
          )}
        >
          <div className="flex gap-3 p-3">
            <Avatar
              fallback={authorInitials(node)}
              src={avatarSrc}
              alt={author}
              className="h-10 w-10 rounded-sm bg-muted"
            />

            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <strong className="text-sm font-semibold text-foreground">
                    {author}
                  </strong>
                  {renderRoleBadge(node.author.role)}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatRelativeDate(node.createdAt, locale)}
                </span>
              </div>

              {node.content ? (
                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
                  {node.content}
                </p>
              ) : null}

              {renderCommentAttachments(node)}
              {renderReactionSummary(node)}

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={cn(
                    "inline-flex h-8 items-center gap-2 border px-3 text-xs font-medium transition-colors",
                    node.viewerReaction === "LIKE"
                      ? "border-violet-300 bg-violet-50 text-violet-700"
                      : "border-border bg-background text-foreground hover:bg-muted",
                  )}
                  onClick={() => void onReaction(node.id, "LIKE")}
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                  <span>{copy.like}</span>
                  {likeCount > 0 ? <span>{likeCount}</span> : null}
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "inline-flex h-8 items-center gap-2 border px-3 text-xs font-medium transition-colors",
                        node.viewerReaction
                          ? "border-violet-300 bg-violet-50 text-violet-700"
                          : "border-border bg-background text-foreground hover:bg-muted",
                      )}
                    >
                      <SmilePlus className="h-3.5 w-3.5" />
                      <span>
                        {node.viewerReaction ? copy.reacted : copy.react}
                      </span>
                      {node.reactionCount > 0 ? (
                        <span>{node.reactionCount}</span>
                      ) : null}
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    align="start"
                    className="w-52 rounded-sm border border-border p-1"
                  >
                    {SOCIAL_REACTION_TYPES.map((type) => (
                      <DropdownMenuItem
                        key={type}
                        className="rounded-none px-2 py-2"
                        onClick={() => void onReaction(node.id, type)}
                      >
                        <span className="mr-1 text-base" aria-hidden="true">
                          {getReactionEmoji(type)}
                        </span>
                        <span className="flex-1">
                          {getReactionLabel(type, locale)}
                        </span>
                        {getCommentReactionCount(node, type) > 0 ? (
                          <span className="text-xs text-muted-foreground">
                            {getCommentReactionCount(node, type)}
                          </span>
                        ) : null}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <button
                  type="button"
                  className={cn(
                    "inline-flex h-8 items-center gap-2 border px-3 text-xs font-medium transition-colors",
                    isReplyOpen
                      ? "border-violet-300 bg-violet-50 text-violet-700"
                      : "border-border bg-background text-foreground hover:bg-muted",
                  )}
                  onClick={() => {
                    setReplyingTo((cur) => (cur === node.id ? null : node.id));
                    setReplyDraft("");
                    setReplyAttachments([]);
                    setReplyStatus(null);
                    closeReplyPickers();
                  }}
                >
                  <MessageSquareReply className="h-3.5 w-3.5" />
                  <span>{isReplyOpen ? copy.cancelReply : copy.reply}</span>
                </button>

                {node.replies.length > 0 ? (
                  <span className="text-xs text-muted-foreground">
                    {node.replies.length} {copy.replyCount}
                  </span>
                ) : null}
              </div>

              {feedback ? (
                <p className="text-xs font-medium text-violet-700">{feedback}</p>
              ) : null}
            </div>
          </div>
        </article>

        {isReplyOpen ? (
          <div className="ml-[52px] border border-border bg-muted/10 p-3">
            {renderToolbar({
              onEmoji: (e) =>
                setReplyDraft((cur) => appendQuickEmoji(cur, e)),
              onAttachment: (a) => setReplyAttachments([a]),
              showEmoji: showReplyEmoji,
              showGif: showReplyGif,
              onToggleEmoji: () => {
                setShowReplyEmoji((v) => !v);
                setShowReplyGif(false);
              },
              onToggleGif: () => {
                setShowReplyGif((v) => !v);
                setShowReplyEmoji(false);
              },
              onClosePickers: closeReplyPickers,
              compact: true,
            })}

            {replyAttachments.length > 0 && replyAttachments[0] && (
              <AttachmentStrip
                attachment={replyAttachments[0]}
                onRemove={() => setReplyAttachments([])}
              />
            )}

            <textarea
              value={replyDraft}
              onChange={(event) => setReplyDraft(event.target.value)}
              placeholder={copy.writeReply}
              rows={3}
              maxLength={2000}
              className="min-h-24 w-full resize-y border border-border bg-background px-3 py-2 text-sm leading-6 text-foreground outline-none transition-colors focus:border-violet-300"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                {replyDraft.trim().length}/2000
              </span>
              <button
                className="inline-flex h-8 items-center gap-2 border border-foreground bg-foreground px-3 text-xs font-medium text-background transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                onClick={() => void submitReply(node.id)}
                disabled={submittingReplyId === node.id}
              >
                <SendHorizontal className="h-3.5 w-3.5" />
                <span>
                  {submittingReplyId === node.id ? copy.posting : copy.postReply}
                </span>
              </button>
            </div>
            {replyStatus ? (
              <p className="mt-2 text-xs font-medium text-violet-700">
                {replyStatus}
              </p>
            ) : null}
          </div>
        ) : null}

        {node.replies.length > 0 ? (
          <ul className="ml-[52px] space-y-3 border-l border-border pl-4">
            {node.replies.map((child) => renderComment(child, depth + 1))}
          </ul>
        ) : null}
      </li>
    );
  }

  const ShellTag = variant === "embedded" ? "div" : "section";

  return (
    <ShellTag
      className={cn(
        variant === "embedded"
          ? "bg-transparent p-0 shadow-none"
          : "border border-border bg-background/95 p-4 shadow-sm md:p-5",
      )}
    >
      {!hideHeader ? (
        <div className="mb-4 border-b border-border pb-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {copy.socialInteraction}
          </div>
          <h2 className="mt-1 text-base font-semibold text-foreground">
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{copy.syncedHint}</p>
        </div>
      ) : null}

      <div className="border border-border bg-muted/10 p-4">
        {renderToolbar({
          onEmoji: (e) => setRootDraft((cur) => appendQuickEmoji(cur, e)),
          onAttachment: (a) => setRootAttachments([a]),
          showEmoji: showRootEmoji,
          showGif: showRootGif,
          onToggleEmoji: () => {
            setShowRootEmoji((v) => !v);
            setShowRootGif(false);
          },
          onToggleGif: () => {
            setShowRootGif((v) => !v);
            setShowRootEmoji(false);
          },
          onClosePickers: closeRootPickers,
        })}

        {rootAttachments.length > 0 && rootAttachments[0] && (
          <AttachmentStrip
            attachment={rootAttachments[0]}
            onRemove={() => setRootAttachments([])}
          />
        )}

        <textarea
          value={rootDraft}
          onChange={(event) => setRootDraft(event.target.value)}
          placeholder={user ? copy.shareThoughts : copy.signInPlaceholder}
          rows={4}
          maxLength={2000}
          className="min-h-32 w-full resize-y border border-border bg-background px-3 py-3 text-sm leading-6 text-foreground outline-none transition-colors focus:border-violet-300"
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {rootDraft.trim().length}/2000
          </span>
          <button
            className="inline-flex h-8 items-center gap-2 border border-foreground bg-foreground px-3 text-xs font-medium text-background transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            onClick={() => void submitRootComment()}
            disabled={submittingRoot}
          >
            <SendHorizontal className="h-3.5 w-3.5" />
            <span>{submittingRoot ? copy.posting : copy.postComment}</span>
          </button>
        </div>

        {status ? (
          <p className="mt-2 text-xs font-medium text-violet-700">{status}</p>
        ) : null}
      </div>

      <div className="mt-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">{copy.loading}</p>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {!loading && !error && comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {emptyHint || copy.noComments}
          </p>
        ) : null}
        {comments.length > 0 ? (
          <ul className="space-y-4">
            {comments.map((node) => renderComment(node, 0))}
          </ul>
        ) : null}
      </div>
    </ShellTag>
  );
}
