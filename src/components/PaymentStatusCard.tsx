/**
 * PaymentStatusCard.tsx
 *
 * Replaces the inline payment block in StudentDashboard.
 * Features:
 *  - Date-aware messages (20th warning, 24th tomorrow, 25th today, 26th+ late)
 *  - Tamil late message with season ticket info
 *  - Small popup on urgent days
 *  - Notification trigger
 *  - Auto status detection
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard, CheckCircle2, Clock, AlertTriangle,
  X, Bell, CalendarClock,
} from "lucide-react";
import { toast } from "sonner";
import StatusBadge from "./StatusBadge";
import { usePaymentDateLogic } from "@/hooks/usePaymentDateLogic";
import type { Student, PaymentHistory, PaymentStatus } from "@/lib/store";

// ── tiny helper ────────────────────────────────────────────
function t(lang: string, en: string, ta: string) {
  return lang === "ta" ? ta : en;
}

// ── gradient / icon per status ─────────────────────────────
const STATUS_CONFIG: Record<
  PaymentStatus,
  { gradient: string; accentBar: string; Icon: React.ElementType; iconColor: string }
> = {
  paid: {
    gradient: "from-emerald-500/15 to-emerald-600/8 border-emerald-500/25",
    accentBar: "bg-emerald-500",
    Icon: CheckCircle2,
    iconColor: "text-emerald-500",
  },
  pending: {
    gradient: "from-amber-500/15 to-amber-600/8 border-amber-500/25",
    accentBar: "bg-amber-500",
    Icon: Clock,
    iconColor: "text-amber-500",
  },
  late: {
    gradient: "from-red-500/15 to-red-600/8 border-red-500/25",
    accentBar: "bg-red-500",
    Icon: AlertTriangle,
    iconColor: "text-red-500",
  },
};

// ── Urgency Popup ──────────────────────────────────────────
function UrgencyPopup({
  info,
  onClose,
}: {
  info: ReturnType<typeof usePaymentDateLogic>;
  onClose: () => void;
}) {
  const isLate = info.zone === "overdue";
  const isTodayLast = info.zone === "today_last";
  const isTomorrowLast = info.zone === "tomorrow_last";

  const bg = isLate
    ? "from-red-500/20 to-red-700/10 border-red-500/40"
    : isTodayLast
    ? "from-red-500/15 to-orange-600/10 border-red-400/40"
    : "from-amber-500/15 to-yellow-600/10 border-amber-400/40";

  const Icon = isLate ? AlertTriangle : CalendarClock;
  const iconColor = isLate ? "text-red-400" : "text-amber-400";

  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className={`relative rounded-2xl border bg-gradient-to-br ${bg} p-4 shadow-xl mb-3`}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div className="shrink-0 mt-0.5">
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div className="space-y-2">
          {/* Title */}
          <p className="text-sm font-bold text-foreground leading-snug">
            {isTodayLast && "⏰ இன்று last date!"}
            {isTomorrowLast && "📅 நாளை last date!"}
            {isLate && `⚠️ ${info.month} கட்டணம் தாமதம்`}
          </p>

          {/* Body message */}
          <div className="text-[12px] text-muted-foreground leading-relaxed whitespace-pre-line">
            {info.cardMessage}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────────
interface Props {
  student: Student;
  paymentHistory: PaymentHistory[];
  lang?: string;
  onAutoStatusChange?: (newStatus: PaymentStatus) => void;
}

export default function PaymentStatusCard({
  student,
  paymentHistory,
  lang = "en",
  onAutoStatusChange,
}: Props) {
  const studentPayments = paymentHistory.filter(p => p.student_id === student.id);
  const [showHistory, setShowHistory] = useState(false);
  const [popupDismissed, setPopupDismissed] = useState(false);
  const notifFiredRef = useRef(false);

  // Local status — updates immediately when auto-change happens
  const [localStatus, setLocalStatus] = useState<PaymentStatus>(
    student.payment_status as PaymentStatus
  );

  // Sync if parent student prop changes (e.g. real-time subscription)
  useEffect(() => {
    setLocalStatus(student.payment_status as PaymentStatus);
    setPopupDismissed(false);
    notifFiredRef.current = false;
  }, [student.payment_status]);

  const handleAutoChange = (newStatus: PaymentStatus) => {
    setLocalStatus(newStatus);
    setPopupDismissed(false);
    notifFiredRef.current = false;
    onAutoStatusChange?.(newStatus);
  };

  const info = usePaymentDateLogic(
    localStatus,
    student.id,
    handleAutoChange,
  );

  const cfg = STATUS_CONFIG[localStatus] ?? STATUS_CONFIG.pending;
  const showPopup = info.showPopup && !popupDismissed;

  // ── Fire notification once per zone per day ──────────────
  useEffect(() => {
    if (notifFiredRef.current) return;
    if (!info.notificationTitle) return;
    if (localStatus === "paid") return;

    const key = `notif_fired_${info.zone}_${info.day}_${info.monthEn}`;
    if (sessionStorage.getItem(key)) return;

    sessionStorage.setItem(key, "1");
    notifFiredRef.current = true;

    // Toast notification
    const isUrgent = info.urgency === "critical" || info.urgency === "high";
    setTimeout(() => {
      if (isUrgent) {
        toast.error(info.notificationTitle!, {
          description: info.notificationBody ?? undefined,
          duration: 8000,
          icon: <Bell className="w-4 h-4" />,
        });
      } else {
        toast.warning(info.notificationTitle!, {
          description: info.notificationBody ?? undefined,
          duration: 5000,
          icon: <Bell className="w-4 h-4" />,
        });
      }

      // Browser push notification (if permission granted)
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(info.notificationTitle!, {
          body: info.notificationBody ?? "",
          icon: "/favicon.ico",
        });
      }
    }, 1500); // slight delay after page load
  }, [info, localStatus]);

  // ── Urgency bar progress ─────────────────────────────────
  const dayProgress =
    localStatus === "paid"
      ? 100
      : localStatus === "late"
      ? 0
      : Math.max(0, Math.min(100, ((25 - info.day) / 25) * 100));

  const progressColor =
    localStatus === "paid"
      ? "bg-emerald-500"
      : info.urgency === "critical"
      ? "bg-red-500"
      : info.urgency === "high"
      ? "bg-orange-500"
      : "bg-amber-500";

  return (
    <>
      {/* ── Popup (urgent days only) ── */}
      <AnimatePresence>
        {showPopup && (
          <UrgencyPopup info={info} onClose={() => setPopupDismissed(true)} />
        )}
      </AnimatePresence>

      {/* ── Main Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className={`glass-card rounded-2xl overflow-hidden border bg-gradient-to-br ${cfg.gradient} shadow-sm`}
      >
        {/* Accent strip */}
        <div className={`h-1 w-full ${cfg.accentBar} opacity-60`} />

        <div className="p-4 space-y-3">
          {/* ── Row 1: title + badge ── */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">
                {t(lang, "Payment Status", "கட்டண நிலை")}
              </h3>
            </div>
            <div className="flex items-center gap-1.5">
              <cfg.Icon className={`w-5 h-5 ${cfg.iconColor}`} />
              <StatusBadge status={localStatus} />
            </div>
          </div>

          {/* ── Row 2: amount + due info ── */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                {t(lang, "Monthly Fee", "மாத கட்டணம்")}
              </p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-3xl font-black text-foreground tracking-tight">Rs. 530</span>
                <span className="text-sm font-normal text-muted-foreground">.00</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">
                {info.monthEn} {info.currentYear}
              </p>
              <p className="text-[11px] font-semibold text-foreground mt-0.5">
                {localStatus === "paid"
                  ? t(lang, "✓ Paid", "✓ செலுத்தப்பட்டது")
                  : localStatus === "late"
                  ? t(lang, "Overdue ⚠️", "தாமதம் ⚠️")
                  : info.day === 25
                  ? t(lang, "⏰ Today is last date!", "⏰ இன்று last date!")
                  : info.day === 24
                  ? t(lang, "📅 Tomorrow is last date!", "📅 நாளை last date!")
                  : t(lang, "Due before 25th", "25-க்குள் செலுத்தவும்")}
              </p>
            </div>
          </div>

          {/* ── Progress bar (days remaining) ── */}
          {localStatus !== "paid" && (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{t(lang, "Days remaining", "மீதமுள்ள நாட்கள்")}</span>
                <span className="font-semibold">
                  {localStatus === "late"
                    ? t(lang, "Overdue", "தாமதம்")
                    : info.day >= 25
                    ? t(lang, "Last day", "கடைசி நாள்")
                    : `${Math.max(0, 25 - info.day)} ${t(lang, "days", "நாட்கள்")}`}
                </span>
              </div>
              <div className="h-1.5 bg-border/40 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${progressColor}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${dayProgress}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>
          )}

          {/* ── Date-based message block (pending/late only) ── */}
          <AnimatePresence>
            {info.cardMessage && localStatus !== "paid" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div
                  className={`rounded-xl p-3 text-[11.5px] leading-relaxed whitespace-pre-line border
                    ${
                      localStatus === "late" || info.urgency === "critical"
                        ? "bg-red-500/8 border-red-500/20 text-red-700 dark:text-red-300"
                        : info.urgency === "high"
                        ? "bg-orange-500/8 border-orange-500/20 text-orange-700 dark:text-orange-300"
                        : "bg-amber-500/8 border-amber-500/20 text-amber-700 dark:text-amber-300"
                    }`}
                >
                  {info.cardMessage}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Payment history accordion ── */}
          {studentPayments.length > 0 && (
            <div className="border-t border-border/30 pt-3">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center justify-between w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-3 h-3" />
                  {t(lang, "Payment History", "கட்டண வரலாறு")} ({studentPayments.length})
                </span>
                <span>{showHistory ? "▲" : "▼"}</span>
              </button>
              <AnimatePresence>
                {showHistory && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-2 space-y-1.5">
                      {studentPayments.map(h => (
                        <div
                          key={h.id}
                          className="flex items-center justify-between text-xs py-1.5 border-b border-border/20 last:border-0"
                        >
                          <span className="text-muted-foreground font-medium">{h.month}</span>
                          <div className="flex items-center gap-2">
                            {h.paid_date && (
                              <span className="text-muted-foreground/70">{h.paid_date}</span>
                            )}
                            <StatusBadge status={h.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
