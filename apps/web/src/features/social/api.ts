import { apiRequest } from "../../lib/api/http";
import type { ApiResult } from "../../lib/api/types";
import {
  SOCIAL_REACTION_TYPES,
  type CreateSocialCommentInput,
  type SocialCommentNode,
  type SocialCommentReaction,
  type SocialCommentScope,
  type SocialReactionType,
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
    signal,
  });
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
  SocialCommentNode,
  SocialCommentReaction,
  SocialCommentScope,
  SocialReactionType,
};
