import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Student = Tables<"students">;
export type PaymentHistory = Tables<"payment_history">;
export type Announcement = Tables<"announcements">;
export type AuditEntry = Tables<"audit_log">;
export type PaymentStatus = "paid" | "pending" | "late";
export type Batch = "2026" | "2027" | "2028" | "2029";
export type Stream = "Arts" | "Commerce" | "Bio Science" | "Mathematics";
export type UserRole = "admin" | "student";
export type RealtimeStatus = "connecting" | "live" | "offline";

export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
  studentId?: string;
}

// ─── AUTO PAYMENT LOGIC (Admin login-ல trigger ஆகும்) ────────────────────────
// pg_cron ஒவ்வொரு மாதமும் automatic run ஆகும்.
// Client-side இது backup-ஆ run ஆகும் — session-ல் ஒரே ஒரு தடவை மட்டும்.
export async function runAutoPaymentLogic(isAdmin: boolean) {
  if (!isAdmin) return;

  const today = new Date().getDate();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const key = `amv_pay_auto_${currentMonth}_d${today}`;
  if (sessionStorage.getItem(key)) return; // இந்த session-ல் already run ஆச்சு
  sessionStorage.setItem(key, "1");

  try {
    if (today === 1) {
      // 1ம் தேதி: எல்லா students-ம் pending
      await (supabase.rpc as any)("auto_set_pending_start_of_month");
    } else if (today === 20) {
      // 20ம் தேதி: unpaid students → late
      await (supabase.rpc as any)("auto_set_late_on_20th");
    } else if (today === 26) {
      // 26ம் தேதி: எல்லாரும் pending reset (next month cycle)
      await (supabase.rpc as any)("auto_reset_on_26th");
    } else if (today > 20 && today < 26) {
      // 21-25: unpaid இன்னும் late-ஆ இருக்கணும்
      await (supabase.rpc as any)("auto_set_late_on_20th");
    }
  } catch (e) {
    // pg_cron functions இல்லாட்டா silently ignore
    console.warn("[AMV] Auto payment RPC not ready:", e);
  }
}

// Generic realtime payload merger
function applyChange<T extends { id: string; created_at?: string }>(
  prev: T[],
  payload: { eventType: "INSERT" | "UPDATE" | "DELETE"; new: any; old: any },
  sortByCreated = true,
): T[] {
  switch (payload.eventType) {
    case "INSERT": {
      if (prev.some(r => r.id === payload.new.id)) return prev;
      const next = [payload.new as T, ...prev];
      return sortByCreated
        ? next.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
        : next;
    }
    case "UPDATE":
      return prev.map(r => (r.id === payload.new.id ? { ...r, ...payload.new } : r));
    case "DELETE":
      return prev.filter(r => r.id !== (payload.old?.id ?? payload.new?.id));
    default:
      return prev;
  }
}

export function useStore() {
  const [students, setStudents] = useState<Student[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("connecting");
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [studentsRes, annRes, auditRes, payRes] = await Promise.all([
      supabase.from("students").select("*").order("created_at", { ascending: false }),
      supabase.from("announcements").select("*").order("created_at", { ascending: false }),
      supabase.from("audit_log").select("*").order("created_at", { ascending: false }),
      supabase.from("payment_history").select("*").order("created_at", { ascending: false }),
    ]);
    if (studentsRes.data) setStudents(studentsRes.data);
    if (annRes.data) setAnnouncements(annRes.data);
    if (auditRes.data) setAudit(auditRes.data);
    if (payRes.data) setPaymentHistory(payRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();

    const channel = supabase
      .channel("realtime-pro")
      .on("postgres_changes", { event: "*", schema: "public", table: "students" }, (payload) => {
        setStudents(prev => applyChange(prev, payload as any));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, (payload) => {
        setAnnouncements(prev => applyChange(prev, payload as any));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_history" }, (payload) => {
        setPaymentHistory(prev => applyChange(prev, payload as any));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "audit_log" }, (payload) => {
        setAudit(prev => applyChange(prev, payload as any));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setRealtimeStatus("live");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") setRealtimeStatus("offline");
        else setRealtimeStatus("connecting");
      });

    channelRef.current = channel;

    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchAll();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", fetchAll);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", fetchAll);
    };
  }, [fetchAll]);

  const addAudit = useCallback(async (action: string, details: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("audit_log").insert({ action, details, performed_by: user?.id });
  }, []);

  const updatePaymentStatus = useCallback(async (id: string, status: PaymentStatus) => {
    const { data: { user } } = await supabase.auth.getUser();
    const adminEmail = user?.email ?? null;
    const currentMonth = new Date().toISOString().slice(0, 7);
    setStudents(prev => prev.map(s => s.id === id ? { ...s, payment_status: status, payment_marked_by: adminEmail } : s));
    const { error } = await supabase.from("students").update({ payment_status: status, payment_marked_by: adminEmail } as any).eq("id", id);
    if (!error) {
      const paidDate = status === "paid" ? new Date().toISOString() : null;
      await supabase.from("payment_history").upsert({
        student_id: id,
        month: currentMonth,
        status,
        amount: 530,
        paid_date: paidDate,
        marked_by_admin: status === "paid" ? adminEmail : null,
      } as any, { onConflict: "student_id,month" });
      await addAudit("Payment Update", `Student ${id} → ${status}`);
    }
  }, [addAudit]);

  const addStudent = useCallback(async (student: {
    full_name: string; address?: string; dob?: string; nic?: string; email?: string;
    school_id?: string; batch: Batch; stream: Stream; student_phone: string;
    parent_name?: string; parent_phone?: string;
  }) => {
    const { data, error } = await supabase.from("students").insert({
      ...student,
      auto_id: "",
    } as TablesInsert<"students">).select().single();
    if (data) {
      const currentMonth = new Date().toISOString().slice(0, 7);
      await supabase.from("payment_history").upsert({
        student_id: data.id,
        month: currentMonth,
        status: "pending",
        amount: 530,
      } as any, { onConflict: "student_id,month" });
      await addAudit("Student Added", `${data.full_name} (${data.auto_id})`);
    }
    return { data, error };
  }, [addAudit]);

  const deleteStudent = useCallback(async (id: string) => {
    const student = students.find(s => s.id === id);
    setStudents(prev => prev.filter(s => s.id !== id));
    await supabase.from("students").delete().eq("id", id);
    if (student) await addAudit("Student Deleted", `${student.full_name} (${student.auto_id})`);
  }, [students, addAudit]);

  const toggleBlock = useCallback(async (id: string) => {
    const student = students.find(s => s.id === id);
    if (!student) return;
    const newStatus = student.account_status === "active" ? "blocked" : "active";
    setStudents(prev => prev.map(s => s.id === id ? { ...s, account_status: newStatus } : s));
    await supabase.from("students").update({ account_status: newStatus }).eq("id", id);
    await addAudit("Account Status", `${student.full_name} → ${newStatus}`);
  }, [students, addAudit]);

  const addAnnouncement = useCallback(async (title: string, message: string, urgent: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("announcements").insert({ title, message, urgent, created_by: user?.id });
    await addAudit("Announcement", `Created: ${title}`);
  }, [addAudit]);

  const deleteAnnouncement = useCallback(async (id: string) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    await supabase.from("announcements").delete().eq("id", id);
    await addAudit("Announcement", `Deleted announcement`);
  }, [addAudit]);

  const updateStudent = useCallback(async (id: string, updates: Partial<Student>) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    const { error } = await supabase.from("students").update(updates as any).eq("id", id);
    if (!error) {
      const student = students.find(s => s.id === id);
      await addAudit("Student Updated", `${student?.full_name || id} details updated`);
    }
  }, [students, addAudit]);

  return {
    students, announcements, audit, paymentHistory, loading, realtimeStatus,
    updatePaymentStatus, addStudent, deleteStudent, toggleBlock,
    addAnnouncement, deleteAnnouncement, updateStudent, fetchAll,
  };
}
