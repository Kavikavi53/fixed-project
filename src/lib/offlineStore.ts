/**
 * offlineStore.ts
 * ───────────────
 * Network இல்லாமல் data localStorage-ல் cache ஆகும்.
 * Network வந்தால் pending changes Supabase-க்கு sync ஆகும்.
 *
 * Usage:
 *   import { offlineStore } from "@/lib/offlineStore";
 *   offlineStore.saveStudents(data);
 *   offlineStore.loadStudents();
 *   offlineStore.queuePaymentUpdate(studentId, status);
 *   offlineStore.queueAnnouncement(title, msg, urgent);
 *   offlineStore.syncPending(supabase, onStudentChange);
 */

export type PaymentStatus = "paid" | "pending" | "late";

export interface PendingPayment {
  type: "payment";
  studentId: string;
  status: PaymentStatus;
  ts: number;
}

export interface PendingAnnouncement {
  type: "announcement";
  title: string;
  message: string;
  urgent: boolean;
  ts: number;
}

export type PendingAction = PendingPayment | PendingAnnouncement;

const KEYS = {
  students: "amv_students_cache",
  announcements: "amv_announcements_cache",
  paymentHistory: "amv_payment_history_cache",
  pending: "amv_pending_actions",
  lastSync: "amv_last_sync",
};

function save(key: string, data: unknown) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

function load<T>(key: string): T | null {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch { return null; }
}

export const offlineStore = {
  // ── SAVE ───────────────────────────────────────────────────
  saveStudents(data: unknown[]) { save(KEYS.students, data); },
  saveAnnouncements(data: unknown[]) { save(KEYS.announcements, data); },
  savePaymentHistory(data: unknown[]) { save(KEYS.paymentHistory, data); },

  // ── LOAD ───────────────────────────────────────────────────
  loadStudents(): unknown[] { return load<unknown[]>(KEYS.students) ?? []; },
  loadAnnouncements(): unknown[] { return load<unknown[]>(KEYS.announcements) ?? []; },
  loadPaymentHistory(): unknown[] { return load<unknown[]>(KEYS.paymentHistory) ?? []; },

  lastSync(): string | null {
    const ts = load<number>(KEYS.lastSync);
    return ts ? new Date(ts).toLocaleTimeString() : null;
  },

  // ── QUEUE OFFLINE ACTIONS ──────────────────────────────────
  queuePaymentUpdate(studentId: string, status: PaymentStatus) {
    const pending = load<PendingAction[]>(KEYS.pending) ?? [];
    // Remove any earlier queued update for same student
    const filtered = pending.filter(
      p => !(p.type === "payment" && (p as PendingPayment).studentId === studentId)
    );
    filtered.push({ type: "payment", studentId, status, ts: Date.now() });
    save(KEYS.pending, filtered);
  },

  queueAnnouncement(title: string, message: string, urgent: boolean) {
    const pending = load<PendingAction[]>(KEYS.pending) ?? [];
    pending.push({ type: "announcement", title, message, urgent, ts: Date.now() });
    save(KEYS.pending, pending);
  },

  getPending(): PendingAction[] {
    return load<PendingAction[]>(KEYS.pending) ?? [];
  },

  clearPending() {
    localStorage.removeItem(KEYS.pending);
  },

  // ── SYNC TO SUPABASE ───────────────────────────────────────
  async syncPending(
    supabase: any,
    onPaymentSynced?: (studentId: string, status: PaymentStatus) => void,
    onAnnouncementSynced?: (title: string) => void,
  ): Promise<{ synced: number; failed: number }> {
    const pending = this.getPending();
    if (pending.length === 0) return { synced: 0, failed: 0 };

    let synced = 0;
    let failed = 0;
    const remaining: PendingAction[] = [];

    for (const action of pending) {
      try {
        if (action.type === "payment") {
          const p = action as PendingPayment;
          const { error } = await supabase
            .from("students")
            .update({ payment_status: p.status })
            .eq("id", p.studentId);
          if (error) throw error;
          onPaymentSynced?.(p.studentId, p.status);
          synced++;
        } else if (action.type === "announcement") {
          const a = action as PendingAnnouncement;
          const { error } = await supabase
            .from("announcements")
            .insert({ title: a.title, message: a.message, urgent: a.urgent });
          if (error) throw error;
          onAnnouncementSynced?.(a.title);
          synced++;
        }
      } catch {
        failed++;
        remaining.push(action);
      }
    }

    save(KEYS.pending, remaining);
    save(KEYS.lastSync, Date.now());
    return { synced, failed };
  },
};

// ── NETWORK MONITOR HOOK ───────────────────────────────────
// useOnlineStatus() — online/offline track பண்ணும்
import { useState, useEffect } from "react";

export function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return online;
}
