import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { useNotifications } from "@/hooks/useNotifications";
import AccessCodePage from "@/components/AccessCodePage";
import LoginPage from "@/components/LoginPage";
import SignUpPage from "@/components/SignUpPage";
import DashboardHeader from "@/components/DashboardHeader";
import AdminDashboard from "@/components/AdminDashboard";
import StudentDashboard from "@/components/StudentDashboard";
import FooterBar from "@/components/FooterBar";
import type { Student, Announcement } from "@/lib/store";

function ProfileSetupLoader({ onRetry, lang }: { onRetry: () => void; lang: "en" | "ta" }) {
  useEffect(() => {
    const timers = [2000, 4000, 8000, 15000].map((ms) => setTimeout(() => onRetry(), ms));
    return () => timers.forEach(clearTimeout);
  }, [onRetry]);

  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground px-4 text-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-sm">
        {lang === "en" ? "Setting up your profile..." : "உங்கள் profile தயாராகிறது..."}
      </p>
    </div>
  );
}

export default function Index() {
  const { accessGranted, user, loading: authLoading, verifyAccessCode, login, logout } = useAuth();
  const store = useStore();
  const [showSignUp, setShowSignUp] = useState(false);
  const [lang, setLang] = useState<"en" | "ta">("en");
  const [soundEnabled, setSoundEnabled] = useState(true);

  const {
    notifications, unreadCount, addNotification,
    markRead, markAllRead, clearAll,
    requestPermission, permissionGranted,
  } = useNotifications(soundEnabled);

  // Track prev students/announcements to detect real changes
  const prevStudentsRef = useRef<Student[]>([]);
  const prevAnnouncementsRef = useRef<Announcement[]>([]);
  const initialLoadDone = useRef(false);



  // ── Realtime notifications: watch student changes ──
  useEffect(() => {
    if (!user || store.loading) return;

    if (!initialLoadDone.current) {
      // First load — just snapshot, don't fire notifications
      prevStudentsRef.current = store.students;
      prevAnnouncementsRef.current = store.announcements;
      initialLoadDone.current = true;
      return;
    }

    const prev = prevStudentsRef.current;
    const curr = store.students;

    // New students
    const added = curr.filter(s => !prev.some(p => p.id === s.id));
    added.forEach(s => {
      addNotification({
        type: "student",
        title: lang === "en" ? "New Student Added" : "புதிய மாணவர் சேர்க்கப்பட்டார்",
        message: `${s.full_name} (${s.auto_id}) — ${s.batch} ${s.stream}`,
        studentId: s.id,
        studentName: s.full_name,
      });
    });

    // Payment status changes
    const payChanged = curr.filter(s => {
      const p = prev.find(p => p.id === s.id);
      return p && p.payment_status !== s.payment_status;
    });
    payChanged.forEach(s => {
      const emoji = s.payment_status === "paid" ? "✅" : s.payment_status === "late" ? "⚠️" : "⏳";
      addNotification({
        type: "payment",
        title: `${emoji} ${lang === "en" ? "Payment Updated" : "கட்டணம் புதுப்பிக்கப்பட்டது"}`,
        message: `${s.full_name} → ${s.payment_status.toUpperCase()}`,
        studentId: s.id,
        studentName: s.full_name,
        urgent: s.payment_status === "late",
      });
    });

    // Account block/unblock
    const blockChanged = curr.filter(s => {
      const p = prev.find(p => p.id === s.id);
      return p && p.account_status !== s.account_status;
    });
    blockChanged.forEach(s => {
      addNotification({
        type: "alert",
        title: s.account_status === "blocked"
          ? (lang === "en" ? "🚫 Account Blocked" : "🚫 கணக்கு தடுக்கப்பட்டது")
          : (lang === "en" ? "✅ Account Unblocked" : "✅ கணக்கு திறக்கப்பட்டது"),
        message: s.full_name,
        urgent: s.account_status === "blocked",
      });
    });

    prevStudentsRef.current = curr;
  }, [store.students, store.loading, user, lang, addNotification]);

  // ── Realtime notifications: watch announcements ──
  useEffect(() => {
    if (!user || store.loading || !initialLoadDone.current) return;

    const prev = prevAnnouncementsRef.current;
    const curr = store.announcements;

    const newAnn = curr.filter(a => !prev.some(p => p.id === a.id));
    newAnn.forEach(a => {
      addNotification({
        type: "announcement",
        title: a.urgent
          ? `🚨 ${lang === "en" ? "Urgent Announcement" : "அவசர அறிவிப்பு"}`
          : `📢 ${lang === "en" ? "New Announcement" : "புதிய அறிவிப்பு"}`,
        message: `${a.title}: ${a.message.slice(0, 80)}${a.message.length > 80 ? "..." : ""}`,
        urgent: a.urgent ?? false,
      });
    });

    prevAnnouncementsRef.current = curr;
  }, [store.announcements, store.loading, user, lang, addNotification]);

  // ── Realtime status notifications ──
  const prevStatusRef = useRef(store.realtimeStatus);
  useEffect(() => {
    const prev = prevStatusRef.current;
    const curr = store.realtimeStatus;
    if (prev !== curr && initialLoadDone.current) {
      if (curr === "live" && prev !== "live") {
        addNotification({
          type: "system",
          title: lang === "en" ? "🟢 Connected" : "🟢 இணைக்கப்பட்டது",
          message: lang === "en" ? "Real-time sync is active." : "Real-time sync இயங்குகிறது.",
        });
      } else if (curr === "offline") {
        addNotification({
          type: "alert",
          title: lang === "en" ? "🔴 Connection Lost" : "🔴 இணைப்பு துண்டிக்கப்பட்டது",
          message: lang === "en" ? "Working offline. Changes will sync when reconnected." : "Offline முறையில் பணிபுரிகிறது.",
          urgent: true,
        });
      }
    }
    prevStatusRef.current = curr;
  }, [store.realtimeStatus, lang, addNotification]);

  if (!accessGranted) return <AccessCodePage onVerify={verifyAccessCode} lang={lang} />;

  if (authLoading) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    if (showSignUp) return <SignUpPage onBack={() => setShowSignUp(false)} />;
    return <LoginPage onLogin={login} onSignUp={() => setShowSignUp(true)} lang={lang} />;
  }

  const currentStudent = user.studentId
    ? store.students.find(s => s.id === user.studentId)
    : store.students.find(s => s.email === user.email);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardHeader
        user={user}
        onLogout={logout}
        realtimeStatus={store.realtimeStatus}
        lang={lang}
        onLangChange={setLang}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
        onClearAll={clearAll}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(v => !v)}
        onRequestPermission={requestPermission}
        permissionGranted={permissionGranted}
      />

      <div className="flex-1">
        {user.role === "admin" ? (
          <AdminDashboard
            students={store.students}
            announcements={store.announcements}
            audit={store.audit}
            loading={store.loading}
            onUpdatePayment={store.updatePaymentStatus}
            onDeleteStudent={store.deleteStudent}
            onToggleBlock={store.toggleBlock}
            onAddAnnouncement={store.addAnnouncement}
            onDeleteAnnouncement={store.deleteAnnouncement}
            onAddStudent={store.addStudent}
            onUpdateStudent={store.updateStudent}
            paymentHistory={store.paymentHistory}
            lang={lang}
          />
        ) : store.loading ? (
          <div className="min-h-screen gradient-hero flex items-center justify-center">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : currentStudent ? (
          <StudentDashboard
            student={currentStudent}
            announcements={store.announcements}
            paymentHistory={store.paymentHistory}
            lang={lang}
          />
        ) : (
          <ProfileSetupLoader onRetry={() => store.fetchAll()} lang={lang} />
        )}
      </div>

      <FooterBar lang={lang} />
    </div>
  );
}
