"use client";

import { useEffect, useState } from "react";
import {
  fetchNotifications,
  markRead,
  markAllRead,
  fetchPreferences,
  updatePreferences,
} from "./api";
import {
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_TYPE_ICONS,
  type Notification,
  type NotificationPreferences,
  type NotificationTypeEnum,
} from "./types";

export default function NotificationsSection() {
  const [unread, setUnread] = useState<Notification[]>([]);
  const [read, setRead] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPreferences, setShowPreferences] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Load notifications and preferences
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [notifData, prefsData] = await Promise.all([
          fetchNotifications(),
          fetchPreferences(),
        ]);
        setUnread(notifData.unread);
        setRead(notifData.read);
        setPreferences(prefsData);
        setError(null);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // Handle single notification mark read
  const handleMarkRead = async (notificationId: number) => {
    try {
      await markRead(notificationId);
      // Optimistically update UI
      const notification = unread.find((n) => n.id === notificationId);
      if (notification) {
        setUnread(unread.filter((n) => n.id !== notificationId));
        setRead([notification, ...read]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to mark read");
      // Reload on error
      const notifData = await fetchNotifications();
      setUnread(notifData.unread);
      setRead(notifData.read);
    }
  };

  // Handle mark all as read
  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      // Optimistically update UI
      setRead([...unread, ...read]);
      setUnread([]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to mark all read");
      // Reload on error
      const notifData = await fetchNotifications();
      setUnread(notifData.unread);
      setRead(notifData.read);
    }
  };

  // Handle preference toggle
  const handleTogglePreference = async (type: NotificationTypeEnum) => {
    if (!preferences) return;

    try {
      setUpdating(true);
      const updated = (preferences[type] as unknown) as boolean;
      const newValue = !updated;
      const result = await updatePreferences({ [type]: newValue });
      setPreferences(result);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="notification-section-loading">
        <p>Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="notification-section">
      {error && <div className="notification-error">{error}</div>}

      {/* Unread Section */}
      <div className="notification-group">
        <div className="notification-group-header">
          <h3>Unread ({unread.length})</h3>
          {unread.length > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="notification-mark-all-btn"
            >
              Mark all read
            </button>
          )}
        </div>

        {unread.length === 0 ? (
          <p className="notification-empty">No unread notifications</p>
        ) : (
          <div className="notification-list">
            {unread.map((notif) => (
              <div key={notif.id} className="notification-item notification-unread">
                <span className="notification-icon">
                  {
                    NOTIFICATION_TYPE_ICONS[
                      notif.type as NotificationTypeEnum
                    ]
                  }
                </span>
                <div className="notification-content">
                  <strong>{notif.title}</strong>
                  <p>{notif.message}</p>
                  <small>
                    {new Date(notif.createdAt).toLocaleDateString()}
                  </small>
                </div>
                <button
                  onClick={() => handleMarkRead(notif.id)}
                  className="notification-read-btn"
                  title="Mark as read"
                >
                  ✓
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Read Section */}
      {read.length > 0 && (
        <div className="notification-group">
          <div className="notification-group-header">
            <h3>Read ({read.length})</h3>
          </div>
          <div className="notification-list">
            {read.map((notif) => (
              <div
                key={notif.id}
                className="notification-item notification-read"
              >
                <span className="notification-icon">
                  {
                    NOTIFICATION_TYPE_ICONS[
                      notif.type as NotificationTypeEnum
                    ]
                  }
                </span>
                <div className="notification-content">
                  <strong>{notif.title}</strong>
                  <p>{notif.message}</p>
                  <small>
                    {new Date(notif.createdAt).toLocaleDateString()}
                  </small>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preferences Panel */}
      <div className="notification-preferences-section">
        <button
          onClick={() => setShowPreferences(!showPreferences)}
          className="notification-preferences-toggle"
        >
          {showPreferences ? "Hide" : "Show"} Preferences
        </button>

        {showPreferences && preferences && (
          <div className="notification-preferences-panel">
            <h4>Notification Preferences</h4>
            {(
              Object.keys(NOTIFICATION_TYPE_LABELS) as NotificationTypeEnum[]
            ).map((type) => (
              <label key={type} className="notification-preference-row">
                <input
                  type="checkbox"
                  checked={preferences[type] || false}
                  onChange={() => handleTogglePreference(type)}
                  disabled={updating}
                />
                <span>{NOTIFICATION_TYPE_LABELS[type]}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
