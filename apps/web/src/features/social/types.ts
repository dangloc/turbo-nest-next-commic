export const SOCIAL_REACTION_TYPES = ["LIKE", "HEART", "HAHA", "WOW", "SAD", "ANGRY"] as const;

export type SocialReactionType = (typeof SOCIAL_REACTION_TYPES)[number];

export interface SocialCommentAuthor {
  id: number;
  nickname: string | null;
  avatar: string | null;
  role: string;
}

export interface SocialCommentNode {
  id: number;
  userId: number;
  novelId: number | null;
  chapterId: number | null;
  parentId: number | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: SocialCommentAuthor;
  replies: SocialCommentNode[];
}

export type SocialCommentScope =
  | { novelId: number; chapterId?: never }
  | { chapterId: number; novelId?: never };

export interface CreateSocialCommentInput {
  content: string;
  parentId?: number;
  novelId?: number;
  chapterId?: number;
}

export interface ToggleCommentReactionInput {
  commentId: number;
  type: SocialReactionType;
}

export interface SocialCommentReaction {
  id: number;
  userId: number;
  commentId: number;
  type: SocialReactionType;
  createdAt: string;
}

export interface SocialValidationResult {
  ok: true;
}

export interface SocialValidationError {
  ok: false;
  message: string;
}

export type SocialValidation = SocialValidationResult | SocialValidationError;

export function normalizePositiveInteger(value: unknown): number | null {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    return null;
  }

  return numeric;
}

export function validateCommentScope(scope: { novelId?: unknown; chapterId?: unknown }): SocialValidation {
  const hasNovel = scope.novelId !== undefined;
  const hasChapter = scope.chapterId !== undefined;

  if (hasNovel === hasChapter) {
    return {
      ok: false,
      message: "Select exactly one comment scope: novel or chapter.",
    };
  }

  if (hasNovel) {
    const value = normalizePositiveInteger(scope.novelId);
    if (!value) {
      return {
        ok: false,
        message: "novelId must be a positive integer.",
      };
    }
  }

  if (hasChapter) {
    const value = normalizePositiveInteger(scope.chapterId);
    if (!value) {
      return {
        ok: false,
        message: "chapterId must be a positive integer.",
      };
    }
  }

  return { ok: true };
}

export function validateCommentContent(content: string): SocialValidation {
  if (!content.trim()) {
    return {
      ok: false,
      message: "Comment content is required.",
    };
  }

  if (content.trim().length > 2000) {
    return {
      ok: false,
      message: "Comment content must be 2000 characters or fewer.",
    };
  }

  return { ok: true };
}

export function reactionLabel(type: SocialReactionType) {
  switch (type) {
    case "LIKE":
      return "Like";
    case "HEART":
      return "Heart";
    case "HAHA":
      return "Haha";
    case "WOW":
      return "Wow";
    case "SAD":
      return "Sad";
    case "ANGRY":
      return "Angry";
    default:
      return type;
  }
}
