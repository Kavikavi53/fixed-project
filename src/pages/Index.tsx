import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import AccessCodePage from "@/components/AccessCodePage";
import LoginPage from "@/components/LoginPage";
import SignUpPage from "@/components/SignUpPage";
import DashboardHeader from "@/components/DashboardHeader";
import AdminDashboard from "@/components/AdminDashboard";
import StudentDashboard from "@/components/StudentDashboard";

export default function Index() {
  const { accessGranted, user, loading: authLoading, verifyAccessCode, login, logout } = useAuth();
  const store = useStore();
  const [showSignUp, setShowSignUp] = useState(false);

  if (!accessGranted) return <AccessCodePage onVerify={verifyAccessCode} />;

  if (authLoading) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    if (showSignUp) return <SignUpPage onBack={() => setShowSignUp(false)} />;
    return <LoginPage onLogin={login} onSignUp={() => setShowSignUp(true)} />;
  }

  // Find student by studentId first, then fallback to email match (handles slight delay after signup)
  const currentStudent = user.studentId
    ? store.students.find(s => s.id === user.studentId)
    : store.students.find(s => s.email === user.email);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader user={user} onLogout={logout} realtimeStatus={store.realtimeStatus} />
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
        />
      ) : store.loading ? (
        <div className="min-h-screen gradient-hero flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : currentStudent ? (
        <StudentDashboard student={currentStudent} announcements={store.announcements} paymentHistory={store.paymentHistory} />
      ) : (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
          <p>Setting up your profile... Please wait.</p>
          <button
            onClick={() => store.fetchAll()}
            className="text-sm text-primary underline hover:no-underline"
          >
            Click here to refresh
          </button>
        </div>
      )}
    </div>
  );
}
