"use client";

import { useState, useEffect, useRef } from "react";
import type { Notification } from "@/types";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const { data } = await res.json();
      setNotifications(data ?? []);
      setUnreadCount((data ?? []).filter((n: Notification) => !n.read_at).length);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const TYPE_ICONS: Record<string, string> = {
    ticket_created: "🎫",
    ticket_status_changed: "🔄",
    ticket_assigned: "👤",
    ticket_support_request: "🆘",
    equipment_created: "🔧",
    calibration_due: "📅",
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 rounded-[9px] flex items-center justify-center text-gray-500 transition-colors hover:bg-gray-100"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unreadCount > 0 && (
          <span
            className="absolute top-1.5 right-1.5 min-w-[16px] h-4 rounded-full bg-red-500 border-2 border-white flex items-center justify-center text-[9px] font-bold text-white px-0.5"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-11 w-[340px] bg-white rounded-[16px] shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-gray-100 z-[1000] overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-[14px] font-bold text-gray-900">Notificações</span>
            {unreadCount > 0 && (
              <button
                onClick={async () => {
                  await fetch("/api/notifications/read-all", { method: "POST" }).catch(() => {});
                  setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
                  setUnreadCount(0);
                }}
                className="text-[12px] text-[#0363a9] hover:underline"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-[13px] text-gray-400">
                Nenhuma notificação
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.read_at && markRead(n.id)}
                  className="flex gap-3 px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors"
                  style={{ background: n.read_at ? undefined : "rgba(3,99,169,0.04)" }}
                >
                  <span className="text-[18px] flex-shrink-0 mt-0.5">
                    {TYPE_ICONS[n.type] ?? "🔔"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[13px] font-semibold text-gray-900 leading-tight">{n.title}</span>
                      <span className="text-[11px] text-gray-400 flex-shrink-0">{timeAgo(n.created_at)}</span>
                    </div>
                    <p className="text-[12px] text-gray-500 mt-0.5 leading-snug">{n.body}</p>
                  </div>
                  {!n.read_at && (
                    <div className="w-2 h-2 rounded-full bg-[#0363a9] flex-shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
