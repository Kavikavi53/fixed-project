import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, BellOff, X, CheckCheck, Trash2, CreditCard,
  Users, Megaphone, ShieldAlert, Zap, Clock, ChevronRight,
  Volume2, VolumeX, SmartphoneNfc,
} from "lucide-react";
import type { Notification, NotifType } from "@/hooks/useNotifications";

interface Props {
  open: boolean;
  onClose: () => void;
  notifications: Notification[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onRequestPermission: () => void;
  permissionGranted: boolean;
  lang?: "en" | "ta";
}

const TYPE_CONFIG: Record<NotifType, { icon: any; color: string; bg: string; label: string }> = {
  payment: { icon: CreditCard, color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30", label: "Payment" },
  student: { icon: Users, color: "text-blue-400", bg: "bg-blue-500/15 border-blue-500/30", label: "Student" },
  announcement: { icon: Megaphone, color: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/30", label: "Announcement" },
  system: { icon: Zap, color: "text-violet-400", bg: "bg-violet-500/15 border-violet-500/30", label: "System" },
  alert: { icon: ShieldAlert, color: "text-red-400", bg: "bg-red-500/15 border-red-500/30", label: "Alert" },
};

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString();
}

export default function NotificationPanel({
  open, onClose, notifications, unreadCount,
  onMarkRead, onMarkAllRead, onClearAll,
  soundEnabled, onToggleSound,
  onRequestPermission, permissionGranted,
  lang = "en",
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, x: 40, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-96 flex flex-col shadow-2xl"
            style={{
              background: "linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%)",
              borderLeft: "1px solid hsl(var(--border))",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60"
              style={{ background: "linear-gradient(135deg, hsl(var(--primary)/0.12) 0%, transparent 100%)" }}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-md">
                    <Bell className="w-4 h-4 text-white" />
                  </div>
                  {unreadCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 shadow-lg"
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </motion.span>
                  )}
                </div>
                <div>
                  <h2 className="font-bold text-sm text-foreground">
                    {lang === "en" ? "Notifications" : "அறிவிப்புகள்"}
                  </h2>
                  <p className="text-[10px] text-muted-foreground">
                    {unreadCount > 0
                      ? `${unreadCount} ${lang === "en" ? "unread" : "படிக்காதவை"}`
                      : lang === "en" ? "All caught up!" : "அனைத்தும் படிக்கப்பட்டது!"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Sound toggle */}
                <button
                  onClick={onToggleSound}
                  title={soundEnabled ? "Mute sounds" : "Enable sounds"}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all"
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>

                {/* Push notifications */}
                {!permissionGranted && (
                  <button
                    onClick={onRequestPermission}
                    title="Enable push notifications"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-all"
                  >
                    <SmartphoneNfc className="w-4 h-4" />
                  </button>
                )}

                {/* Mark all read */}
                {unreadCount > 0 && (
                  <button
                    onClick={onMarkAllRead}
                    title="Mark all as read"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 transition-all"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}

                {/* Clear all */}
                {notifications.length > 0 && (
                  <button
                    onClick={onClearAll}
                    title="Clear all"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Push notification prompt */}
            <AnimatePresence>
              {!permissionGranted && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <button
                    onClick={onRequestPermission}
                    className="w-full flex items-center gap-3 px-5 py-3 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 border-b border-amber-500/20 hover:bg-amber-500/15 transition-colors text-left"
                  >
                    <SmartphoneNfc className="w-4 h-4 shrink-0" />
                    <span>
                      {lang === "en"
                        ? "Enable push notifications to get alerts even when the tab is closed."
                        : "Tab மூடியிருந்தாலும் alerts பெற push notifications enable செய்யுங்கள்."}
                    </span>
                    <ChevronRight className="w-3 h-3 ml-auto shrink-0" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Notifications list */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 py-16">
                  <div className="w-16 h-16 rounded-2xl bg-secondary/60 flex items-center justify-center">
                    <BellOff className="w-7 h-7 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-foreground text-sm">
                      {lang === "en" ? "No notifications yet" : "இன்னும் அறிவிப்புகள் இல்லை"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {lang === "en"
                        ? "Payment updates, student changes & announcements will appear here."
                        : "கட்டண புதுப்பிப்புகள் & மாற்றங்கள் இங்கே தோன்றும்."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  <AnimatePresence initial={false}>
                    {notifications.map((notif, i) => {
                      const cfg = TYPE_CONFIG[notif.type];
                      const Icon = cfg.icon;
                      return (
                        <motion.div
                          key={notif.id}
                          initial={{ opacity: 0, y: -12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ delay: i < 5 ? i * 0.04 : 0 }}
                          onClick={() => onMarkRead(notif.id)}
                          className={`relative flex gap-3 px-5 py-3.5 cursor-pointer transition-all hover:bg-secondary/40 ${
                            !notif.read ? "bg-primary/5" : ""
                          }`}
                        >
                          {/* Unread dot */}
                          {!notif.read && (
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                          )}

                          {/* Icon */}
                          <div className={`shrink-0 w-9 h-9 rounded-xl border flex items-center justify-center ${cfg.bg}`}>
                            <Icon className={`w-4 h-4 ${cfg.color}`} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-xs font-semibold leading-tight ${!notif.read ? "text-foreground" : "text-muted-foreground"}`}>
                                {notif.urgent && <span className="text-red-500 mr-1">🚨</span>}
                                {notif.title}
                              </p>
                              <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                {timeAgo(notif.timestamp)}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                              {notif.message}
                            </p>
                            {notif.actionLabel && notif.onAction && (
                              <button
                                onClick={(e) => { e.stopPropagation(); notif.onAction?.(); }}
                                className="mt-1.5 text-[10px] font-semibold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                              >
                                {notif.actionLabel}
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-border/50 bg-secondary/20">
              <p className="text-[10px] text-center text-muted-foreground">
                {lang === "en"
                  ? `${notifications.length} total · Real-time sync active`
                  : `${notifications.length} மொத்தம் · Real-time sync இயங்குகிறது`}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
