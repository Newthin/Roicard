"use client";

import { cn } from "@/lib/cn";
import {
  getNotifications,
  markNotificationRead,
  type Notification,
} from "@/lib/api/notifications";
import { Bell, CheckCheck, Loader2, UserPlus, CreditCard } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

function notificationIcon(type: string) {
  switch (type) {
    case "connection_request":
    case "connection_approved":
      return <UserPlus className="h-4 w-4 text-roicard-accent" aria-hidden />;
    case "smart_card_shipped":
    case "smart_card_delivered":
      return <CreditCard className="h-4 w-4 text-roicard-accent" aria-hidden />;
    default:
      return <Bell className="h-4 w-4 text-roicard-accent" aria-hidden />;
  }
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

type NotificationBellProps = {
  className?: string;
};

export function NotificationBell({ className }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await getNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    } catch {
      // Keep previous state on failure
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = window.setInterval(load, 30000);
    return () => window.clearInterval(interval);
  }, [load]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointer = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen]);

  const handleMarkRead = async (notification: Notification) => {
    if (notification.read_at) return;
    setMarkingId(notification.id);
    try {
      await markNotificationRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n
        )
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch {
      // Ignore mark-read failures
    } finally {
      setMarkingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.read_at);
    if (unread.length === 0) return;
    await Promise.allSettled(unread.map((n) => markNotificationRead(n.id)));
    setNotifications((prev) =>
      prev.map((n) =>
        n.read_at ? n : { ...n, read_at: new Date().toISOString() }
      )
    );
    setUnreadCount(0);
  };

  return (
    <div ref={menuRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="relative rounded-lg p-2 text-roicard-text-muted transition-colors hover:bg-roicard-bg-muted hover:text-roicard-text"
        aria-label="Notifications"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unreadCount > 0 && (
          <span
            className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-roicard-primary px-1 text-[10px] font-semibold leading-none text-roicard-on-primary"
            aria-label={`${unreadCount} unread notifications`}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="menu"
          className={cn(
            "fixed inset-x-4 top-[4.5rem] z-50 overflow-hidden rounded-2xl",
            "border border-roicard-border bg-roicard-bg-elevated shadow-xl",
            "sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-80"
          )}
        >
          <div className="flex items-center justify-between border-b border-roicard-border px-4 py-3">
            <p className="text-sm font-semibold text-roicard-text">
              Notifications
            </p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs font-medium text-roicard-accent transition-colors hover:text-roicard-text"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-roicard-text-muted">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Loading…
              </div>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-roicard-text-muted">
                No notifications yet
              </p>
            ) : (
              <ul>
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => handleMarkRead(notification)}
                      disabled={!!markingId}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-roicard-bg-muted",
                        !notification.read_at && "bg-roicard-bg-muted/50"
                      )}
                    >
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-roicard-bg-muted">
                        {notificationIcon(notification.data?.type ?? notification.type)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium text-roicard-text">
                            {notification.data?.title ?? "Notification"}
                          </span>
                          <span className="shrink-0 text-xs text-roicard-text-muted">
                            {timeAgo(notification.created_at)}
                          </span>
                        </span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-roicard-text-muted">
                          {notification.data?.body ?? ""}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
