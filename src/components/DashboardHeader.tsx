import { useState } from "react";
import { Bus, LogOut, Wifi, WifiOff, Loader2, AlertTriangle, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import ThemeToggle from "./ThemeToggle";
import NotificationPanel from "./NotificationPanel";
import type { AppUser } from "@/lib/auth";
import type { RealtimeStatus } from "@/lib/store";
import type { Notification } from "@/hooks/useNotifications";

interface Props {
  user: AppUser;
  onLogout: () => void;
  realtimeStatus?: RealtimeStatus;
  lang: "en" | "ta";
  onLangChange: (l: "en" | "ta") => void;
  notifications?: Notification[];
  unreadCount?: number;
  onMarkRead?: (id: string) => void;
  onMarkAllRead?: () => void;
  onClearAll?: () => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  onRequestPermission?: () => void;
  permissionGranted?: boolean;
}

export default function DashboardHeader({
  user, onLogout, realtimeStatus = "connecting", lang, onLangChange,
  notifications = [], unreadCount = 0,
  onMarkRead, onMarkAllRead, onClearAll,
  soundEnabled = true, onToggleSound,
  onRequestPermission, permissionGranted = false,
}: Props) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const statusConfig = {
    live: { icon: Wifi, color: "text-success", label: lang === "en" ? "Live" : "நேரடி", pulse: true },
    connecting: { icon: Loader2, color: "text-warning", label: lang === "en" ? "Sync..." : "இணைக்கிறது...", pulse: false },
    offline: { icon: WifiOff, color: "text-destructive", label: lang === "en" ? "Offline" : "இணைப்பில்லை", pulse: false },
  }[realtimeStatus];
  const Icon = statusConfig.icon;

  return (
    <>
      <header className="sticky top-0 z-50 glass-card border-b border-border/50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
              <Bus className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground leading-tight">A.M.V Season Tickets</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {user.role === "admin"
                  ? (lang === "en" ? "Admin Panel" : "நிர்வாக பலகை")
                  : (lang === "en" ? "Student Portal" : "மாணவர் போர்டல்")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className={`hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full bg-secondary/60 ${statusConfig.color}`}>
              <span className="relative flex w-2 h-2">
                {statusConfig.pulse && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                )}
                <Icon className={`w-3 h-3 ${realtimeStatus === "connecting" ? "animate-spin" : ""}`} />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider">{statusConfig.label}</span>
            </div>

            <span className="text-xs text-muted-foreground hidden md:inline">{user.email}</span>

            <div className="flex items-center bg-secondary rounded-lg p-0.5 gap-0.5">
              <button
                onClick={() => onLangChange("en")}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  lang === "en" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >EN</button>
              <button
                onClick={() => onLangChange("ta")}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  lang === "ta" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >த</button>
            </div>

            <ThemeToggle />

            {/* NOTIFICATION BELL */}
            <button
              onClick={() => setNotifOpen(true)}
              className="relative w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all"
            >
              <Bell className="w-4 h-4" />
              <AnimatePresence>
                {unreadCount > 0 && (
                  <motion.span
                    key="badge"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 shadow-md"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </motion.span>
                )}
              </AnimatePresence>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500/40 animate-ping pointer-events-none" />
              )}
            </button>

            <Button variant="ghost" size="icon" onClick={() => setShowLogoutConfirm(true)} className="text-muted-foreground hover:text-destructive">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <NotificationPanel
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkRead={onMarkRead ?? (() => {})}
        onMarkAllRead={onMarkAllRead ?? (() => {})}
        onClearAll={onClearAll ?? (() => {})}
        soundEnabled={soundEnabled}
        onToggleSound={onToggleSound ?? (() => {})}
        onRequestPermission={onRequestPermission ?? (() => {})}
        permissionGranted={permissionGranted}
        lang={lang}
      />

      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
            onClick={() => setShowLogoutConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[320px] rounded-3xl overflow-hidden"
              style={{ background: "rgba(13,22,48,0.97)", border: "1px solid rgba(239,68,68,0.25)", boxShadow: "0 32px 64px rgba(0,0,0,0.6)" }}
            >
              <div className="h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(239,68,68,0.8), transparent)" }} />
              <div className="p-6 space-y-5 text-center">
                <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 2, repeat: Infinity }}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
                  style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}
                >
                  <AlertTriangle className="w-8 h-8" style={{ color: "#f87171" }} />
                </motion.div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-black" style={{ background: "linear-gradient(135deg, #fff, #fca5a5)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    {lang === "en" ? "Confirm Logout" : "வெளியேற உறுதிப்படுத்துங்கள்"}
                  </h3>
                  <p className="text-[12px] leading-relaxed" style={{ color: "rgba(147,197,253,0.55)" }}>
                    {lang === "en" ? "Are you sure you want to logout from your account?" : "உங்கள் account-இல் இருந்து வெளியேற விரும்புகிறீர்களா?"}
                  </p>
                  <p className="text-[10px]" style={{ color: "rgba(147,197,253,0.35)" }}>
                    {lang === "en" ? `Logged in as ${user.email}` : `${user.email} ஆக உள்நுழைந்துள்ளீர்கள்`}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setShowLogoutConfirm(false)} className="h-11 rounded-2xl text-sm font-bold transition-all"
                    style={{ background: "rgba(147,197,253,0.08)", border: "1px solid rgba(147,197,253,0.15)", color: "rgba(147,197,253,0.7)" }}>
                    {lang === "en" ? "Cancel" : "ரத்து செய்"}
                  </button>
                  <button onClick={() => { setShowLogoutConfirm(false); onLogout(); }} className="h-11 rounded-2xl text-sm font-bold text-white transition-all"
                    style={{ background: "linear-gradient(135deg, #dc2626, #ef4444)", boxShadow: "0 6px 20px rgba(239,68,68,0.35)" }}>
                    {lang === "en" ? "Yes, Logout" : "ஆம், வெளியேறு"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
