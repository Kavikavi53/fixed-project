import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Phone, MapPin, GraduationCap, Calendar, CreditCard,
  Megaphone, ShieldX, Send, ChevronDown, ChevronUp, Bell, CheckCircle2, Clock, AlertTriangle
} from "lucide-react";
import StatusBadge from "./StatusBadge";
import LiveClock from "./LiveClock";
import StudentAvatar from "./StudentAvatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Student, Announcement, PaymentHistory } from "@/lib/store";

interface Props {
  student: Student;
  announcements: Announcement[];
  paymentHistory: PaymentHistory[];
  lang?: "en" | "ta";
}

const ADMIN_EMAIL = "hiphoptamizhakavi@gmail.com";

const t = (lang: "en" | "ta", en: string, ta: string) => lang === "en" ? en : ta;

export default function StudentDashboard({ student, announcements, paymentHistory, lang = "en" }: Props) {
  const studentPayments = paymentHistory.filter(p => p.student_id === student.id);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const handleContactRequest = async () => {
    if (!message.trim()) { toast.error(t(lang, "Please type a message", "Message தட்டச்சு பண்ணுங்க")); return; }
    setSending(true);
    try {
      const subject = encodeURIComponent(`Account Unblock Request - ${student.full_name} (${student.auto_id})`);
      const body = encodeURIComponent(
        `Student Name: ${student.full_name}\nStudent ID: ${student.auto_id}\nEmail: ${student.email}\nPhone: ${student.student_phone}\n\nMessage:\n${message}`
      );
      window.location.href = `mailto:${ADMIN_EMAIL}?subject=${subject}&body=${body}`;
      setSent(true);
      toast.success(t(lang, "Request sent!", "Request அனுப்பப்பட்டது!"));
    } catch {
      toast.error(t(lang, "Error. Try again.", "Error. மீண்டும் try பண்ணுங்க."));
    }
    setSending(false);
  };

  const now = new Date();
  const dayOfMonth = now.getDate();
  const currentMonth = now.toLocaleString("ta-IN", { month: "long", year: "numeric" });
  const isLateWarning = student.payment_status === "late" && dayOfMonth >= 26;

  const paymentColor = {
    paid: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30",
    pending: "from-amber-500/20 to-amber-600/10 border-amber-500/30",
    late: "from-red-500/20 to-red-600/10 border-red-500/30",
  }[student.payment_status] ?? "from-secondary to-secondary/50 border-border";

  const paymentIcon = {
    paid: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
    pending: <Clock className="w-5 h-5 text-amber-500" />,
    late: <AlertTriangle className="w-5 h-5 text-red-500" />,
  }[student.payment_status];

  // ── BLOCKED ──────────────────────────────────────────────
  if (student.account_status === "blocked") {
    return (
      <div className="min-h-[calc(100vh-4rem)] gradient-hero flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm">
          <div className="glass-card rounded-3xl p-6 space-y-5 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/15 flex items-center justify-center mx-auto ring-4 ring-destructive/10">
              <ShieldX className="w-8 h-8 text-destructive" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">{t(lang, "Account Blocked", "கணக்கு தடுக்கப்பட்டது")}</h2>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                {t(lang, "Your account has been temporarily blocked. Contact admin.", "உங்கள் கணக்கு தற்காலிகமாக block ஆகியுள்ளது. Admin-ஐ தொடர்பு கொள்ளுங்க.")}
              </p>
            </div>
            <div className="text-left p-3 rounded-xl bg-secondary space-y-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t(lang, "Admin Contact", "Admin தொடர்பு")}</p>
              <p className="text-sm text-primary font-mono break-all">{ADMIN_EMAIL}</p>
              <p className="text-xs text-muted-foreground">{student.full_name} · {student.auto_id}</p>
            </div>
            {!sent ? (
              <div className="space-y-3 text-left">
                <Textarea
                  placeholder={t(lang, "Write your message...", "உங்கள் message இங்கே...")}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="bg-secondary text-sm resize-none"
                  rows={3}
                />
                <Button onClick={handleContactRequest} disabled={sending} className="w-full gradient-primary text-primary-foreground h-11 rounded-xl">
                  <Send className="w-4 h-4 mr-2" />
                  {sending ? t(lang, "Sending...", "அனுப்புகிறது...") : t(lang, "Send Request", "Request அனுப்பு")}
                </Button>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {t(lang, "Request sent! Admin will reply soon.", "Request அனுப்பப்பட்டது! Admin reply பண்ணுவாங்க.")}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // ── MAIN DASHBOARD ────────────────────────────────────────
  return (
    <div className="pb-20 px-3 pt-3 max-w-lg mx-auto space-y-3">

      {/* Urgent Announcements */}
      <AnimatePresence>
        {announcements.filter(a => a.urgent).map((a, i) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card rounded-2xl p-3.5 border-l-4 border-amber-500 flex items-start gap-3"
          >
            <Bell className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-amber-500 uppercase tracking-wider">⚠ {t(lang, "Urgent", "அவசரம்")}</p>
              <p className="text-sm font-semibold text-foreground mt-0.5 leading-snug">{a.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{a.message}</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-3xl overflow-hidden"
      >
        {/* Top gradient strip */}
        <div className="h-16 gradient-primary opacity-30" />

        <div className="px-4 pb-4 -mt-8">
          <div className="flex items-end gap-4">
            <div className="ring-4 ring-background rounded-full">
              <StudentAvatar
                name={student.full_name}
                photoUrl={student.profile_photo_url}
                studentId={student.id}
                canUpload={true}
              />
            </div>
            <div className="pb-1 min-w-0 flex-1">
              <h2 className="text-base font-bold text-foreground leading-tight truncate">{student.full_name}</h2>
              <p className="text-xs font-mono text-primary">{student.auto_id}</p>
            </div>
            <div className="pb-1">
              <LiveClock />
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
            <span className="text-[11px] bg-secondary px-2.5 py-1 rounded-full text-secondary-foreground font-medium">{student.batch}</span>
            <span className="text-[11px] bg-secondary px-2.5 py-1 rounded-full text-secondary-foreground font-medium">{student.stream}</span>
            <StatusBadge status={student.payment_status} />
          </div>
        </div>
      </motion.div>

      {/* Payment Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className={`glass-card rounded-2xl p-4 bg-gradient-to-br border ${paymentColor}`}
      >
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">{t(lang, "Payment Status", "கட்டண நிலை")}</h3>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{t(lang, "Current Month Fee", "இந்த மாத கட்டணம்")}</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">Rs. 530<span className="text-sm font-normal text-muted-foreground">.00</span></p>
          </div>
          <div className="flex flex-col items-center gap-1">
            {paymentIcon}
            <StatusBadge status={student.payment_status} />
          </div>
        </div>

        {/* Late Warning — 26th and after */}
        {isLateWarning && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 p-3 rounded-xl bg-red-500/15 border border-red-500/30 flex items-start gap-2"
          >
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-400 leading-relaxed font-medium">
              நீங்கள் பணம் செலுத்த தாமதமானதால் <span className="font-bold text-red-300">{currentMonth}</span> மாதத்துக்குரிய பயன்களை பெற்றுக்கொள்ள முடியாது.
            </p>
          </motion.div>
        )}

        {/* Payment History toggle */}
        {studentPayments.length > 0 && (
          <div className="mt-3 border-t border-border/30 pt-3">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center justify-between w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="font-semibold uppercase tracking-wider">{t(lang, "Payment History", "கட்டண வரலாறு")} ({studentPayments.length})</span>
              {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
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
                      <div key={h.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/20 last:border-0">
                        <span className="text-muted-foreground font-medium">{h.month}</span>
                        <div className="flex items-center gap-2">
                          {h.paid_date && <span className="text-muted-foreground/70">{h.paid_date}</span>}
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
      </motion.div>

      {/* Personal Details - Collapsible */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.13 }}
        className="glass-card rounded-2xl overflow-hidden"
      >
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-secondary/40 transition-colors"
        >
          <span className="text-sm font-semibold text-foreground flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            {t(lang, "Personal Details", "தனிப்பட்ட விவரங்கள்")}
          </span>
          {showDetails ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-0 divide-y divide-border/30">
                {[
                  { icon: User, label: t(lang, "NIC", "NIC"), value: student.nic },
                  { icon: Calendar, label: t(lang, "DOB", "பிறந்த தேதி"), value: student.dob },
                  { icon: MapPin, label: t(lang, "Address", "முகவரி"), value: student.address },
                  { icon: Phone, label: t(lang, "Phone", "தொலைபேசி"), value: student.student_phone },
                  { icon: User, label: t(lang, "Parent", "பெற்றோர்"), value: student.parent_name ? `${student.parent_name}${student.parent_phone ? ` (${student.parent_phone})` : ""}` : "-" },
                  { icon: GraduationCap, label: t(lang, "School ID", "பள்ளி ID"), value: student.school_id },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3 py-2.5 text-sm">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground flex-shrink-0 w-20 text-xs">{label}</span>
                    <span className="text-foreground text-xs leading-snug break-words min-w-0">{value ?? "-"}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="glass-card rounded-2xl p-4 space-y-2.5"
        >
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-primary" />
            {t(lang, "Announcements", "அறிவிப்புகள்")}
            <span className="ml-auto text-xs bg-primary/15 text-primary px-2 py-0.5 rounded-full font-medium">{announcements.length}</span>
          </h3>
          <div className="space-y-2">
            {announcements.map(a => (
              <div key={a.id} className={`p-3 rounded-xl bg-secondary text-sm ${a.urgent ? "border-l-2 border-amber-500" : ""}`}>
                <p className="font-medium text-foreground text-xs leading-snug">{a.title}</p>
                <p className="text-muted-foreground text-xs mt-1 leading-relaxed">{a.message}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

    </div>
  );
}