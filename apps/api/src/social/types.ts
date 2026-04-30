import { CommentReactionType } from '@prisma/client';

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
  createdAt: Date;
  updatedAt: Date;
  author: SocialCommentAuthor;
  reactions: SocialCommentReactionSummary[];
  reactionCount: number;
  viewerReaction: CommentReactionType | null;
  replies: SocialCommentNode[];
}

export interface SocialCommentScope {
  novelId?: number;
  chapterId?: number;
}

export interface CreateSocialCommentInput extends SocialCommentScope {
  content: string;
  parentId?: number;
}

export interface ToggleCommentReactionInput {
  commentId: number;
  type: CommentReactionType;
}

export interface SocialCommentReaction {
  id: number;
  userId: number;
  commentId: number;
  type: CommentReactionType;
  createdAt: Date;
}

export interface SocialCommentReactionSummary {
  type: CommentReactionType;
  count: number;
}

export interface RecentReviewItem {
  id: number;
  rating: number;
  content: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: number;
    nickname: string | null;
    avatar: string | null;
  };
  novel: {
    id: number;
    title: string;
    featuredImage: string | null;
  };
}

export interface NovelReviewItem {
  id: number;
  userId: number;
  novelId: number;
  rating: number;
  content: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NovelReviewListItem extends NovelReviewItem {
  user: {
    id: number;
    nickname: string | null;
    avatar: string | null;
  };
}

export interface NovelReviewListResponse {
  items: NovelReviewListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface NovelReviewSummary {
  novelId: number;
  averageRating: number;
  ratingCount: number;
  viewerReview: NovelReviewItem | null;
}

export interface CreateOrUpdateNovelReviewInput {
  rating: number;
  content?: string | null;
}
