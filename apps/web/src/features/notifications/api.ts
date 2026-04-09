import { getSessionToken } from "../../lib/auth/session-store";
import type {
  Notification,
  NotificationListResponse,
  NotificationPreferences,
  NotificationTypeEnum,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function fetchNotifications(
  limit?: number,
  skip?: number
): Promise<NotificationListResponse> {
  const token = getSessionToken();
  if (!token) throw new Error("No auth token found");

  const params = new URLSearchParams();
  if (limit) params.append("limit", String(limit));
  if (skip) params.append("skip", String(skip));

  const response = await fetch(
    `${API_BASE}/api/notifications?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) throw new Error("Failed to fetch notifications");
  return response.json();
}

export async function markRead(notificationId: number): Promise<Notification> {
  const token = getSessionToken();
  if (!token) throw new Error("No auth token found");

  const response = await fetch(
    `${API_BASE}/api/notifications/${notificationId}/read`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) throw new Error("Failed to mark notification as read");
  return response.json();
}

export async function markAllRead(): Promise<{ affectedCount: number }> {
  const token = getSessionToken();
  if (!token) throw new Error("No auth token found");

  const response = await fetch(`${API_BASE}/api/notifications/read-all`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) throw new Error("Failed to mark all notifications as read");
  return response.json();
}

export async function fetchPreferences(): Promise<NotificationPreferences> {
  const token = getSessionToken();
  if (!token) throw new Error("No auth token found");

  const response = await fetch(
    `${API_BASE}/api/notifications/preferences`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) throw new Error("Failed to fetch notification preferences");
  return response.json();
}

export async function updatePreferences(
  prefs: Partial<Record<NotificationTypeEnum, boolean>>
): Promise<NotificationPreferences> {
  const token = getSessionToken();
  if (!token) throw new Error("No auth token found");

  const response = await fetch(
    `${API_BASE}/api/notifications/preferences`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(prefs),
    }
  );

  if (!response.ok) throw new Error("Failed to update notification preferences");
  return response.json();
}
