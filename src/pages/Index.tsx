import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useStore, runAutoPaymentLogic } from "@/lib/store";
import AccessCodePage from "@/components/AccessCodePage";
import LoginPage from "@/components/LoginPage";
import SignUpPage from "@/components/SignUpPage";
import DashboardHeader from "@/components/DashboardHeader";
import AdminDashboard from "@/components/AdminDashboard";
import StudentDashboard from "@/components/StudentDashboard";
import FooterBar from "@/components/FooterBar";

// Auto-retry loader — click to refresh இல்லாம automatically retry பண்ணும்
function ProfileSetupLoader({ onRetry, lang }: { onRetry: () => void; lang: "en" | "ta" }) {
  useEffect(() => {
    // 2s, 4s, 8s, 15s — exponential retry
    const timers = [2000, 4000, 8000, 15000].map((ms) =>
      setTimeout(() => onRetry(), ms)
    );
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

  // Admin login ஆனவுடன் auto payment logic trigger
  useEffect(() => {
    if (user?.role === "admin") {
      runAutoPaymentLogic(true).then(() => {
        setTimeout(() => store.fetchAll(), 1000);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);


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
