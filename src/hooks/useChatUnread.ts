/**
 * useChatUnread.ts
 *
 * DB-backed unread message counts.
 * Replaces the previous localStorage-only approach so offline messages
 * are never missed — even when the user was fully offline and localStorage
 * was cleared or on a different device.
 *
 * Usage (admin):
 *   const { unreadMap, refresh, markRead } = useChatUnread({ role: "admin" });
 *
 * Usage (student):
 *   const { unreadMap, refresh, markRead } = useChatUnread({ role: "student", studentId });
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Options {
  role: "admin" | "student";
  /** Required when role === "student" */
  studentId?: string;
}

interface UseChatUnreadResult {
  /** { [studentId]: unreadCount } */
  unreadMap: Record<string, number>;
  totalUnread: number;
  /** Re-fetch from DB */
  refresh: () => Promise<void>;
  /** Mark all messages for a student as read in DB + local state */
  markRead: (studentId: string) => Promise<void>;
}

export function useChatUnread({ role, studentId }: Options): UseChatUnreadResult {
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});

  const refresh = useCallback(async () => {
    try {
      if (role === "admin") {
        // Admin sees unread messages sent by students
        const { data, error } = await supabase
          .from("chat_messages")
          .select("student_id")
          .eq("sender_role", "student")
          .eq("is_read", false);

        if (error) { console.error("[useChatUnread] fetch error:", error); return; }

        const map: Record<string, number> = {};
        for (const row of data ?? []) {
          map[row.student_id] = (map[row.student_id] ?? 0) + 1;
        }
        setUnreadMap(map);

      } else if (role === "student" && studentId) {
        // Student sees unread messages sent by admin
        const { count, error } = await supabase
          .from("chat_messages")
          .select("id", { count: "exact", head: true })
          .eq("student_id", studentId)
          .eq("sender_role", "admin")
          .eq("is_read", false);

        if (error) { console.error("[useChatUnread] fetch error:", error); return; }
        setUnreadMap({ [studentId]: count ?? 0 });
      }
    } catch (err) {
      console.error("[useChatUnread] unexpected error:", err);
    }
  }, [role, studentId]);

  const markRead = useCallback(async (sid: string) => {
    try {
      // Mark messages sent by the OTHER party as read
      const senderRole = role === "admin" ? "student" : "admin";
      const { error } = await supabase
        .from("chat_messages")
        .update({ is_read: true })
        .eq("student_id", sid)
        .eq("sender_role", senderRole)
        .eq("is_read", false);

      if (error) { console.error("[useChatUnread] markRead error:", error); return; }

      setUnreadMap(prev => ({ ...prev, [sid]: 0 }));
    } catch (err) {
      console.error("[useChatUnread] markRead unexpected error:", err);
    }
  }, [role]);

  // Initial fetch
  useEffect(() => {
    refresh();
  }, [refresh]);

  const totalUnread = Object.values(unreadMap).reduce((a, b) => a + b, 0);

  return { unreadMap, totalUnread, refresh, markRead };
}
