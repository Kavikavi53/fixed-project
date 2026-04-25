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

export default function Index() {
  const { accessGranted, user, loading: authLoading, verifyAccessCode, login, logout } = useAuth();
  const store = useStore();
  const [showSignUp, setShowSignUp] = useState(false);
  const [lang, setLang] = useState<"en" | "ta">("en");

  // Admin login ஆனவுடன் auto payment logic trigger
  useEffect(() => {
    if (user?.role === "admin") {
      runAutoPaymentLogic(true).then(() => {
        // Logic run ஆன பிறகு data refresh
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
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground px-4 text-center">
            <p className="text-sm">{lang === "en" ? "Setting up your profile... Please wait." : "உங்கள் profile தயாராகிறது... காத்திருங்கள்."}</p>
            <button onClick={() => store.fetchAll()} className="text-sm text-primary underline hover:no-underline">
              {lang === "en" ? "Click here to refresh" : "புதுப்பிக்க இங்கே கிளிக் பண்ணுங்க"}
            </button>
          </div>
        )}
      </div>

      <FooterBar lang={lang} />
    </div>
  );
}
