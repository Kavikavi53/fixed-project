/**
 * useOfflineData.ts
 * ─────────────────
 * Supabase-ஐ wrap செய்து:
 *  - Online: நேரடியாக fetch + localStorage-ல் cache
 *  - Offline: localStorage-ல் இருந்து load
 *  - Network வந்தால்: pending changes auto-sync
 *
 * Usage (Index.tsx / DashboardPage-ல்):
 *   const { students, announcements, paymentHistory,
 *           updatePaymentStatus, addAnnouncement,
 *           online, pendingCount, syncNow, isSyncing } = useOfflineData(supabase);
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { offlineStore, useOnlineStatus, type PaymentStatus } from "./offlineStore";
import type { Student, Announcement, PaymentHistory, AuditEntry } from "./store";

export function useOfflineData(supabase: any) {
  const online = useOnlineStatus();
  const [students, setStudents] = useState<Student[]>(() =>
    offlineStore.loadStudents() as Student[]
  );
  const [announcements, setAnnouncements] = useState<Announcement[]>(() =>
    offlineStore.loadAnnouncements() as Announcement[]
  );
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>(() =>
    offlineStore.loadPaymentHistory() as PaymentHistory[]
  );
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(() =>
    offlineStore.getPending().length
  );

  const refreshPending = useCallback(() => {
    setPendingCount(offlineStore.getPending().length);
  }, []);

  // ── FETCH FROM SUPABASE ────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!supabase) return;
    try {
      const [sRes, aRes, phRes, auRes] = await Promise.all([
        supabase.from("students").select("*").order("auto_id"),
        supabase.from("announcements").select("*").order("created_at", { ascending: false }),
        supabase.from("payment_history").select("*"),
        supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(100),
      ]);

      if (sRes.data) {
        setStudents(sRes.data);
        offlineStore.saveStudents(sRes.data);
      }
      if (aRes.data) {
        setAnnouncements(aRes.data);
        offlineStore.saveAnnouncements(aRes.data);
      }
      if (phRes.data) {
        setPaymentHistory(phRes.data);
        offlineStore.savePaymentHistory(phRes.data);
      }
      if (auRes.data) setAudit(auRes.data);
    } catch (err) {
      // offline — localStorage data already loaded in state
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // ── SYNC PENDING ───────────────────────────────────────────
  const syncNow = useCallback(async () => {
    if (!online || isSyncing) return;
    const pending = offlineStore.getPending();
    if (pending.length === 0) return;

    setIsSyncing(true);
    const toastId = toast.loading(`Syncing ${pending.length} pending changes...`);

    try {
      const { synced, failed } = await offlineStore.syncPending(
        supabase,
        (studentId, status) => {
          setStudents(prev =>
            prev.map(s => s.id === studentId ? { ...s, payment_status: status } : s)
          );
        },
        (title) => {
          // Announcement synced — refetch to get id
        }
      );

      refreshPending();
      if (synced > 0) {
        toast.success(`✅ ${synced} changes synced!`, { id: toastId, duration: 3000 });
        await fetchAll(); // refresh to get latest from server
      }
      if (failed > 0) {
        toast.error(`${failed} changes failed — will retry later`, { id: toastId });
      }
    } finally {
      setIsSyncing(false);
    }
  }, [online, isSyncing, supabase, fetchAll, refreshPending]);

  // ── AUTO-SYNC WHEN COMING BACK ONLINE ─────────────────────
  const prevOnline = useRef(online);
  useEffect(() => {
    if (!prevOnline.current && online) {
      // Just came back online
      toast.success("🌐 Back online! Syncing changes...", { duration: 2000 });
      syncNow().then(() => fetchAll());
    }
    prevOnline.current = online;
  }, [online, syncNow, fetchAll]);

  // ── INITIAL FETCH ──────────────────────────────────────────
  useEffect(() => {
    if (online) {
      fetchAll();
    } else {
      setLoading(false);
      toast.warning("📵 Offline mode — showing cached data", { duration: 3000 });
    }
  }, []);

  // ── REAL-TIME SUBSCRIPTION ────────────────────────────────
  useEffect(() => {
    if (!supabase || !online) return;
    const channel = supabase
      .channel("realtime-all")
      .on("postgres_changes", { event: "*", schema: "public", table: "students" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_history" }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, online, fetchAll]);

  // ── ACTIONS ────────────────────────────────────────────────

  const updatePaymentStatus = useCallback(async (studentId: string, status: PaymentStatus) => {
    // Optimistic update
    setStudents(prev =>
      prev.map(s => s.id === studentId ? { ...s, payment_status: status } : s)
    );

    if (!online) {
      offlineStore.queuePaymentUpdate(studentId, status);
      refreshPending();
      toast.warning("📵 Saved offline — will sync when online", { duration: 3000 });
      return;
    }

    const { error } = await supabase
      .from("students")
      .update({ payment_status: status })
      .eq("id", studentId);

    if (error) {
      // Rollback
      await fetchAll();
      throw error;
    }
  }, [online, supabase, fetchAll, refreshPending]);

  const addAnnouncement = useCallback(async (title: string, message: string, urgent: boolean) => {
    if (!online) {
      offlineStore.queueAnnouncement(title, message, urgent);
      // Optimistic local add
      const tempAnn: Announcement = {
        id: `temp_${Date.now()}`,
        title, message, urgent,
        created_at: new Date().toISOString(),
      };
      setAnnouncements(prev => [tempAnn, ...prev]);
      refreshPending();
      toast.warning("📵 Announcement saved offline — will post when online", { duration: 3000 });
      return;
    }

    const { data, error } = await supabase
      .from("announcements")
      .insert({ title, message, urgent })
      .select()
      .single();

    if (error) throw error;
    if (data) setAnnouncements(prev => [data, ...prev]);
  }, [online, supabase, refreshPending]);

  const deleteAnnouncement = useCallback(async (id: string) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    if (!online) {
      toast.warning("📵 Offline — deletion will sync when online", { duration: 2000 });
      return;
    }
    await supabase.from("announcements").delete().eq("id", id);
  }, [online, supabase]);

  const deleteStudent = useCallback(async (id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id));
    if (!online) {
      toast.warning("📵 Offline — deletion will sync when online", { duration: 2000 });
      return;
    }
    await supabase.from("students").delete().eq("id", id);
  }, [online, supabase]);

  const toggleBlock = useCallback(async (id: string) => {
    const student = students.find(s => s.id === id);
    if (!student) return;
    const newStatus = student.account_status === "active" ? "blocked" : "active";
    setStudents(prev =>
      prev.map(s => s.id === id ? { ...s, account_status: newStatus } : s)
    );
    if (!online) {
      toast.warning("📵 Offline — will sync when online", { duration: 2000 });
      return;
    }
    await supabase.from("students").update({ account_status: newStatus }).eq("id", id);
  }, [students, online, supabase]);

  const addStudent = useCallback(async (studentData: any) => {
    if (!online) {
      toast.warning("📵 Cannot add student while offline", { duration: 3000 });
      return { error: { message: "Offline — cannot add student" } };
    }
    const result = await supabase.from("students").insert(studentData).select().single();
    if (result.data) {
      setStudents(prev => [...prev, result.data]);
      offlineStore.saveStudents([...students, result.data]);
    }
    return result;
  }, [online, supabase, students]);

  const updateStudent = useCallback(async (id: string, updates: Partial<Student>) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    if (!online) {
      toast.warning("📵 Offline — will sync when online", { duration: 2000 });
      return;
    }
    await supabase.from("students").update(updates).eq("id", id);
  }, [online, supabase]);

  return {
    students,
    announcements,
    paymentHistory,
    audit,
    loading,
    online,
    pendingCount,
    isSyncing,
    syncNow,
    updatePaymentStatus,
    addAnnouncement,
    deleteAnnouncement,
    deleteStudent,
    toggleBlock,
    addStudent,
    updateStudent,
    refetch: fetchAll,
  };
}
