import { apiRequest } from "../../lib/api/http";
import type { ApiResult } from "../../lib/api/types";
import {
  SOCIAL_REACTION_TYPES,
  type CreateSocialCommentInput,
  type NovelReviewListResponse,
  type NovelReviewSummary,
  type RecentReviewItem,
  type SocialCommentNode,
  type SocialCommentReaction,
  type SocialCommentScope,
  type SocialReactionType,
  type SubmitNovelReviewInput,
  type ToggleCommentReactionInput,
  validateCommentContent,
  validateCommentScope,
} from "./types";

function authHeaders(token?: string) {
  if (!token) {
    return undefined;
  }

  return {
    authorization: "Bearer " + token,
  };
}

function buildScopeParams(scope: SocialCommentScope) {
  const params = new URLSearchParams();

  if ("novelId" in scope) {
    params.set("novelId", String(scope.novelId));
  }

  if ("chapterId" in scope) {
    params.set("chapterId", String(scope.chapterId));
  }

  return params;
}

export async function fetchSocialComments(
  scope: SocialCommentScope,
  token?: string,
  signal?: AbortSignal,
): Promise<ApiResult<SocialCommentNode[]>> {
  const scopeValidation = validateCommentScope(scope);
  if (!scopeValidation.ok) {
    return {
      ok: false,
      error: {
        status: 400,
        message: scopeValidation.message,
      },
    };
  }

  const params = buildScopeParams(scope);
  const path = "/social/comments?" + params.toString();

  return apiRequest<SocialCommentNode[]>(path, {
    method: "GET",
    headers: authHeaders(token),
    includeCredentials: true,
    signal,
  });
}

export async function fetchRecentReviews(
  limit = 9,
  signal?: AbortSignal,
): Promise<ApiResult<RecentReviewItem[]>> {
  const normalizedLimit =
    Number.isInteger(limit) && limit > 0 ? Math.min(limit, 18) : 9;

  return apiRequest<RecentReviewItem[]>(
    "/social/reviews/recent?limit=" + normalizedLimit,
    {
      method: "GET",
      signal,
    },
  );
}

export async function fetchNovelReviewSummary(
  novelId: number,
  token?: string,
  signal?: AbortSignal,
): Promise<ApiResult<NovelReviewSummary>> {
  if (!Number.isInteger(novelId) || novelId <= 0) {
    return {
      ok: false,
      error: {
        status: 400,
        message: "novelId must be a positive integer.",
      },
    };
  }

  return apiRequest<NovelReviewSummary>(
    "/social/novels/" + novelId + "/reviews/summary",
    {
      method: "GET",
      headers: authHeaders(token),
      includeCredentials: true,
      signal,
    },
  );
}

export async function fetchNovelReviews(
  novelId: number,
  page = 1,
  pageSize = 10,
  signal?: AbortSignal,
): Promise<ApiResult<NovelReviewListResponse>> {
  if (!Number.isInteger(novelId) || novelId <= 0) {
    return {
      ok: false,
      error: {
        status: 400,
        message: "novelId must be a positive integer.",
      },
    };
  }

  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const safePageSize =
    Number.isInteger(pageSize) && pageSize > 0 ? Math.min(pageSize, 50) : 10;
  const params = new URLSearchParams({
    page: String(safePage),
    pageSize: String(safePageSize),
  });

  return apiRequest<NovelReviewListResponse>(
    "/social/novels/" + novelId + "/reviews?" + params.toString(),
    {
      method: "GET",
      signal,
    },
  );
}

function validateReviewInput(input: SubmitNovelReviewInput) {
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    return {
      ok: false as const,
      message: "Rating must be from 1 to 5 stars.",
    };
  }

  if (input.content && input.content.trim().length > 2000) {
    return {
      ok: false as const,
      message: "Review content must be 2000 characters or fewer.",
    };
  }

  return { ok: true as const };
}

export async function submitNovelReview(
  novelId: number,
  input: SubmitNovelReviewInput,
  token?: string,
): Promise<ApiResult<NovelReviewSummary>> {
  if (!Number.isInteger(novelId) || novelId <= 0) {
    return {
      ok: false,
      error: {
        status: 400,
        message: "novelId must be a positive integer.",
      },
    };
  }

  const validation = validateReviewInput(input);
  if (!validation.ok) {
    return {
      ok: false,
      error: {
        status: 400,
        message: validation.message,
      },
    };
  }

  return apiRequest<NovelReviewSummary>(
    "/social/novels/" + novelId + "/reviews",
    {
      method: "POST",
      headers: authHeaders(token),
      body: {
        rating: input.rating,
        content: input.content?.trim() || null,
      },
      includeCredentials: true,
    },
  );
}

function validateCreateInput(input: CreateSocialCommentInput) {
  const contentValidation = validateCommentContent(input.content);
  if (!contentValidation.ok) {
    return contentValidation;
  }

  const isReply = input.parentId !== undefined;
  if (!isReply) {
    return validateCommentScope(input);
  }

  if (!Number.isInteger(input.parentId) || (input.parentId as number) <= 0) {
    return {
      ok: false as const,
      message: "parentId must be a positive integer.",
    };
  }

  if (input.novelId !== undefined || input.chapterId !== undefined) {
    const scopeValidation = validateCommentScope(input);
    if (!scopeValidation.ok) {
      return scopeValidation;
    }
  }

  return { ok: true as const };
}

export async function createSocialComment(
  input: CreateSocialCommentInput,
  token?: string,
): Promise<ApiResult<SocialCommentNode>> {
  const validation = validateCreateInput(input);
  if (!validation.ok) {
    return {
      ok: false,
      error: {
        status: 400,
        message: validation.message,
      },
    };
  }

  return apiRequest<SocialCommentNode>("/social/comments", {
    method: "POST",
    headers: authHeaders(token),
    body: {
      content: input.content.trim(),
      novelId: input.novelId,
      chapterId: input.chapterId,
      parentId: input.parentId,
    },
    includeCredentials: true,
  });
}

function validateReactionInput(input: ToggleCommentReactionInput) {
  if (!Number.isInteger(input.commentId) || input.commentId <= 0) {
    return {
      ok: false as const,
      message: "commentId must be a positive integer.",
    };
  }

  if (!SOCIAL_REACTION_TYPES.includes(input.type)) {
    return {
      ok: false as const,
      message: "Unsupported reaction type.",
    };
  }

  return { ok: true as const };
}

export async function toggleSocialReaction(
  input: ToggleCommentReactionInput,
  token?: string,
): Promise<ApiResult<SocialCommentReaction | null>> {
  const validation = validateReactionInput(input);
  if (!validation.ok) {
    return {
      ok: false,
      error: {
        status: 400,
        message: validation.message,
      },
    };
  }

  return apiRequest<SocialCommentReaction | null>(
    "/social/comments/" + input.commentId + "/reactions",
    {
      method: "POST",
      headers: authHeaders(token),
      body: {
        type: input.type,
      },
      includeCredentials: true,
    },
  );
}

export function buildReplyInput(
  parentId: number,
  content: string,
  scope: SocialCommentScope,
): CreateSocialCommentInput {
  if ("novelId" in scope) {
    return {
      parentId,
      content,
      novelId: scope.novelId,
    };
  }

  return {
    parentId,
    content,
    chapterId: scope.chapterId,
  };
}

export type {
  CreateSocialCommentInput,
  NovelReviewListResponse,
  NovelReviewSummary,
  RecentReviewItem,
  SocialCommentNode,
  SocialCommentReaction,
  SocialCommentScope,
  SocialReactionType,
  SubmitNovelReviewInput,
};
