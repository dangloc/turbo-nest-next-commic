import type { Notification as PrismaNotification, NotificationType } from "@prisma/client";

export type Notification = PrismaNotification;

export type NotificationTypeEnum = NotificationType;

export interface NotificationGroup {
  groupType: "unread" | "read";
  notifications: Notification[];
  count: number;
}

export interface NotificationPreferences {
  userId: number;
  SYSTEM: boolean;
  NOVEL_UPDATE: boolean;
  COMMENT_REPLY: boolean;
  COMMENT_REACTION: boolean;
  MISSION: boolean;
  REWARD: boolean;
}

export interface NotificationListResponse {
  unread: Notification[];
  read: Notification[];
  total: number;
  unreadCount: number;
  readCount: number;
}

export interface MarkReadResult {
  success: boolean;
  affectedCount?: number;
}

export const NOTIFICATION_TYPE_LABELS: Record<NotificationTypeEnum, string> = {
  SYSTEM: "System",
  NOVEL_UPDATE: "Novel Update",
  COMMENT_REPLY: "Comment Reply",
  COMMENT_REACTION: "Reaction",
  MISSION: "Mission",
  REWARD: "Reward",
};

export const NOTIFICATION_TYPE_ICONS: Record<NotificationTypeEnum, string> = {
  SYSTEM: "[SYS]",
  NOVEL_UPDATE: "[NOVEL]",
  COMMENT_REPLY: "[REPLY]",
  COMMENT_REACTION: "[REACT]",
  MISSION: "[MISSION]",
  REWARD: "[REWARD]",
};
