import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Phone, MapPin, GraduationCap, Calendar, CreditCard,
  Megaphone, ShieldX, Send, ChevronDown, ChevronUp, Bell,
  CheckCircle2, Clock, AlertTriangle, Smartphone, X,
  Zap, Shield, ArrowRight, Sparkles, TrendingUp, Pencil,
} from "lucide-react";

// Gender icons as inline SVG
const MaleIcon = ({ className }: { className?: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="10" cy="14" r="5"/><path d="M21 3l-6.5 6.5"/><path d="M15 3h6v6"/>
  </svg>
);
const FemaleIcon = ({ className }: { className?: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="8" r="5"/><path d="M12 13v8"/><path d="M9 18h6"/>
  </svg>
);

import StatusBadge from "./StatusBadge";
import LiveClock from "./LiveClock";
import StudentAvatar from "./StudentAvatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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

// ─── Edit Request Modal ─────────────────────────────────────────────────────
function EditRequestModal({
  open, onClose, student, lang,
}: {
  open: boolean; onClose: () => void; student: Student; lang: "en" | "ta";
}) {
  const [form, setForm] = useState({
    full_name: student.full_name,
    student_phone: student.student_phone,
    parent_name: student.parent_name ?? "",
    parent_phone: student.parent_phone ?? "",
    address: student.address ?? "",
    nic: student.nic ?? "",
    school_id: student.school_id ?? "",
    dob: student.dob ?? "",
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }));

  const handleSend = async () => {
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const requestData = {
        student_id: student.id,
        student_name: student.full_name,
        student_auto_id: student.auto_id,
        requested_by: user?.id ?? null,
        fields: form,
        status: "pending",
        created_at: new Date().toISOString(),
      };
      await supabase.from("audit_log").insert({
        action: "EDIT_REQUEST",
        details: JSON.stringify(requestData),
        performed_by: user?.id ?? null,
      });
      setSent(true);
      toast.success(t(lang, "Edit request sent! Admin will review soon.", "Edit request அனுப்பப்பட்டது! Admin பார்ப்பாங்க."));
      setTimeout(() => { onClose(); setSent(false); }, 2000);
    } catch {
      toast.error(t(lang, "Failed to send request. Try again.", "Request அனுப்ப முடியவில்லை. மீண்டும் try பண்ணுங்க."));
    }
    setSending(false);
  };

  const fields: { key: keyof typeof form; label: string; labelTa: string; type?: string }[] = [
    { key: "full_name", label: "Full Name", labelTa: "முழு பெயர்" },
    { key: "student_phone", label: "Student Phone", labelTa: "மாணவர் தொலைபேசி" },
    { key: "parent_name", label: "Parent Name", labelTa: "பெற்றோர் பெயர்" },
    { key: "parent_phone", label: "Parent Phone", labelTa: "பெற்றோர் தொலைபேசி" },
    { key: "nic", label: "NIC", labelTa: "NIC" },
    { key: "dob", label: "Date of Birth", labelTa: "பிறந்த தேதி", type: "date" },
    { key: "address", label: "Address", labelTa: "முகவரி" },
    { key: "school_id", label: "School ID", labelTa: "பள்ளி ID" },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 80, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 80, opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="w-full sm:max-w-md glass-card rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>
            <div className="relative gradient-primary px-5 pt-5 pb-4">
              <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Pencil className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Request</p>
                  <h2 className="text-white font-bold text-base leading-tight">
                    {t(lang, "Edit Personal Details", "தனிப்பட்ட விவரங்கள் திருத்து")}
                  </h2>
                </div>
              </div>
              <p className="text-white/70 text-xs mt-2 leading-relaxed">
                {t(lang,
                  "Changes will be sent to admin for approval. Once approved, your details will be updated in real-time.",
                  "திருத்தங்கள் admin-க்கு அனுப்பப்படும். Approve ஆனால் விவரங்கள் real-time update ஆகும்."
                )}
              </p>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4">
              {sent ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                  <p className="text-sm font-semibold text-foreground text-center">
                    {t(lang, "Request sent! Admin will review and approve.", "Request அனுப்பப்பட்டது!")}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {fields.map(({ key, label, labelTa, type }) => (
                    <div key={key} className={key === "address" ? "col-span-full" : ""}>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                        {t(lang, label, labelTa)}
                      </label>
                      <Input
                        type={type ?? "text"}
                        value={form[key]}
                        onChange={e => set(key, e.target.value)}
                        className="bg-secondary text-sm h-10"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!sent && (
              <div className="px-5 pb-6 pt-2">
                <Button onClick={handleSend} disabled={sending} className="w-full gradient-primary text-primary-foreground h-11 rounded-xl">
                  <Send className="w-4 h-4 mr-2" />
                  {sending ? t(lang, "Sending...", "அனுப்புகிறது...") : t(lang, "Send Edit Request to Admin", "Admin-க்கு Edit Request அனுப்பு")}
                </Button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Online Pay Modal (unchanged) ───────────────────────────────────────────
function OnlinePayModal({ open, onClose, lang }: { open: boolean; onClose: () => void; lang: "en" | "ta" }) {
  const features = [
    { icon: Zap, label: t(lang, "Instant Confirmation", "உடனடி உறுதிப்படுத்தல்"), sub: t(lang, "Real-time payment status update", "Real-time கட்டண நிலை புதுப்பிப்பு") },
    { icon: Shield, label: t(lang, "100% Secure", "100% பாதுகாப்பானது"), sub: t(lang, "End-to-end encrypted transactions", "முழுமையான குறியாக்கம்") },
    { icon: Smartphone, label: t(lang, "Sri Lanka Payment Methods", "இலங்கை கட்டண முறைகள்"), sub: t(lang, "Visa · Mastercard · Bank Transfer · Lanka QR", "Visa · Mastercard · வங்கி பரிமாற்றம் · Lanka QR") },
  ];
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }} onClick={onClose}>
          <motion.div initial={{ y: 80, opacity: 0, scale: 0.96 }} animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 80, opacity: 0, scale: 0.96 }} transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="w-full sm:max-w-sm glass-card rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-center pt-3 sm:hidden"><div className="w-10 h-1 rounded-full bg-border" /></div>
            <div className="relative gradient-primary px-6 pt-6 pb-6 overflow-hidden">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, white 0%, transparent 60%)" }} />
              <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center"><CreditCard className="w-6 h-6 text-white" /></div>
                <div>
                  <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Feature Preview</p>
                  <h2 className="text-white font-bold text-lg leading-tight">{t(lang, "Online Payment", "ஆன்லைன் கட்டணம்")}</h2>
                </div>
              </div>
              <p className="text-white/80 text-xs leading-relaxed">{t(lang, "Pay your Rs. 530 monthly fee instantly from anywhere — no cash, no queues.", "Rs. 530 மாத கட்டணம் எங்கிருந்தும் உடனடியாக செலுத்துங்கள் — பணம் இல்லாமல், வரிசை இல்லாமல்.")}</p>
            </div>
            <div className="flex justify-center pt-3 pb-3">
              <span className="bg-amber-500 text-white text-[11px] font-black uppercase tracking-widest px-5 py-1.5 rounded-full shadow-lg">✦ {t(lang, "Coming Soon", "விரைவில் வருகிறது")} ✦</span>
            </div>
            <div className="mx-5 mb-3 p-3 rounded-2xl bg-secondary/60 flex items-center justify-center gap-3">
              <div className="flex items-center justify-center bg-white rounded-lg px-2.5 py-1.5 shadow-sm"><span className="text-[#1A1F71] font-black text-sm tracking-tight italic">VISA</span></div>
              <div className="flex items-center justify-center bg-white rounded-lg px-2 py-1.5 shadow-sm gap-0.5"><div className="w-5 h-5 rounded-full bg-red-500 opacity-90" /><div className="w-5 h-5 rounded-full bg-yellow-400 opacity-90 -ml-2.5" /></div>
              <div className="flex items-center justify-center bg-white rounded-lg px-2.5 py-1.5 shadow-sm"><span className="text-[#0066CC] font-black text-[10px] tracking-tight">Lanka QR</span></div>
              <div className="flex items-center justify-center bg-white rounded-lg px-2.5 py-1.5 shadow-sm"><span className="text-gray-700 font-bold text-[10px]">Bank</span></div>
            </div>
            <div className="px-5 pb-2 space-y-2.5">
              {features.map(({ icon: Icon, label, sub }) => (
                <div key={label} className="flex items-center gap-3 p-3 rounded-2xl bg-secondary/60">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0"><Icon className="w-4 h-4 text-primary" /></div>
                  <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-foreground leading-tight">{label}</p><p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{sub}</p></div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                </div>
              ))}
            </div>
            <div className="px-5 pt-3 pb-6">
              <div className="w-full h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center gap-2 cursor-not-allowed select-none">
                <CreditCard className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-primary">{t(lang, "Pay Now", "இப்போது செலுத்து")}</span>
                <ArrowRight className="w-4 h-4 text-primary/50" />
              </div>
              <p className="text-center text-[11px] text-muted-foreground mt-2.5 leading-relaxed">{t(lang, "We're working hard to bring you a seamless payment experience. Stay tuned!", "சிறந்த கட்டண அனுபவம் வழங்க கடுமையாக உழைக்கிறோம். காத்திருங்கள்!")}</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function StudentDashboard({ student, announcements, paymentHistory, lang = "en" }: Props) {
  const studentPayments = paymentHistory.filter(p => p.student_id === student.id);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  // Personal Details shown by default (open)
  const [showDetails, setShowDetails] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const handleContactRequest = async () => {
    if (!message.trim()) { toast.error(t(lang, "Please type a message", "Message தட்டச்சு பண்ணுங்க")); return; }
    setSending(true);
    try {
      const subject = encodeURIComponent(`Account Unblock Request - ${student.full_name} (${student.auto_id})`);
      const body = encodeURIComponent(`Student Name: ${student.full_name}\nStudent ID: ${student.auto_id}\nEmail: ${student.email}\nPhone: ${student.student_phone}\n\nMessage:\n${message}`);
      window.location.href = `mailto:${ADMIN_EMAIL}?subject=${subject}&body=${body}`;
      setSent(true);
      toast.success(t(lang, "Request sent!", "Request அனுப்பப்பட்டது!"));
    } catch { toast.error(t(lang, "Error. Try again.", "Error. மீண்டும் try பண்ணுங்க.")); }
    setSending(false);
  };

  const paymentConfig = {
    paid:    { gradient: "from-emerald-500/15 to-emerald-600/8 border-emerald-500/25", icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />, accentBar: "bg-emerald-500" },
    pending: { gradient: "from-amber-500/15  to-amber-600/8  border-amber-500/25",    icon: <Clock        className="w-5 h-5 text-amber-500"  />, accentBar: "bg-amber-500" },
    late:    { gradient: "from-red-500/15    to-red-600/8    border-red-500/25",      icon: <AlertTriangle className="w-5 h-5 text-red-500"  />, accentBar: "bg-red-500" },
  }[student.payment_status] ?? { gradient: "from-secondary to-secondary/50 border-border", icon: null, accentBar: "bg-primary" };

  const genderRaw = ((student as any).gender ?? "").toString().toLowerCase();
  const isMale   = genderRaw.startsWith("m") || genderRaw === "boy";
  const isFemale = genderRaw.startsWith("f") || genderRaw === "girl";
  const hasGender = isMale || isFemale;
  const GenderIcon  = isMale ? MaleIcon : FemaleIcon;
  const genderLabel = isMale ? t(lang, "Male", "ஆண்") : t(lang, "Female", "பெண்");

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
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{t(lang, "Your account has been temporarily blocked. Contact admin.", "உங்கள் கணக்கு தற்காலிகமாக block ஆகியுள்ளது. Admin-ஐ தொடர்பு கொள்ளுங்க.")}</p>
            </div>
            <div className="text-left p-3 rounded-xl bg-secondary space-y-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t(lang, "Admin Contact", "Admin தொடர்பு")}</p>
              <p className="text-sm text-primary font-mono break-all">{ADMIN_EMAIL}</p>
              <p className="text-xs text-muted-foreground">{student.full_name} · {student.auto_id}</p>
            </div>
            {!sent ? (
              <div className="space-y-3 text-left">
                <Textarea placeholder={t(lang, "Write your message...", "உங்கள் message இங்கே...")} value={message} onChange={e => setMessage(e.target.value)} className="bg-secondary text-sm resize-none" rows={3} />
                <Button onClick={handleContactRequest} disabled={sending} className="w-full gradient-primary text-primary-foreground h-11 rounded-xl">
                  <Send className="w-4 h-4 mr-2" />{sending ? t(lang, "Sending...", "அனுப்புகிறது...") : t(lang, "Send Request", "Request அனுப்பு")}
                </Button>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />{t(lang, "Request sent! Admin will reply soon.", "Request அனுப்பப்பட்டது! Admin reply பண்ணுவாங்க.")}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pb-24 px-3 pt-3 max-w-lg mx-auto space-y-3">
      <OnlinePayModal open={showPayModal} onClose={() => setShowPayModal(false)} lang={lang} />
      <EditRequestModal open={showEditModal} onClose={() => setShowEditModal(false)} student={student} lang={lang} />

      <AnimatePresence>
        {announcements.filter(a => a.urgent).map((a, i) => (
          <motion.div key={a.id} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="glass-card rounded-2xl p-3.5 border-l-4 border-amber-500 flex items-start gap-3">
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
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-3xl overflow-hidden shadow-md">
        <div className="gradient-primary px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center"><Sparkles className="w-3.5 h-3.5 text-white" /></div>
            <p className="text-white font-bold text-xs uppercase tracking-widest">A.M.V Season Tickets</p>
          </div>
          <LiveClock />
        </div>
        <div className="px-4 py-3.5 flex items-center gap-3.5">
          <div className="flex-shrink-0">
            <StudentAvatar name={student.full_name} photoUrl={student.profile_photo_url} studentId={student.id} canUpload={true} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-foreground leading-snug" style={{ fontSize: student.full_name.length > 20 ? "0.82rem" : student.full_name.length > 15 ? "0.92rem" : "1rem" }}>{student.full_name}</h2>
            <p className="text-xs font-mono text-primary mt-0.5 font-semibold">{student.auto_id}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[11px] bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-semibold">{student.batch}</span>
              <span className="text-[11px] bg-secondary px-2.5 py-0.5 rounded-full text-secondary-foreground font-medium">{student.stream}</span>
              <StatusBadge status={student.payment_status} />
            </div>
          </div>
        </div>
        <div className="mx-4 mb-3.5 h-1 rounded-full bg-secondary overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: student.payment_status === "paid" ? "100%" : student.payment_status === "pending" ? "50%" : "20%" }}
            transition={{ duration: 1, delay: 0.3, ease: "easeOut" }} className={`h-full rounded-full ${paymentConfig.accentBar}`} />
        </div>
      </motion.div>

      {/* Payment Card */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        className={`glass-card rounded-2xl overflow-hidden border bg-gradient-to-br ${paymentConfig.gradient} shadow-sm`}>
        <div className={`h-1 w-full ${paymentConfig.accentBar} opacity-60`} />
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">{t(lang, "Payment Status", "கட்டண நிலை")}</h3>
            </div>
            <div className="flex items-center gap-1.5">{paymentConfig.icon}<StatusBadge status={student.payment_status} /></div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">{t(lang, "Monthly Fee", "மாத கட்டணம்")}</p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-3xl font-black text-foreground tracking-tight">Rs. 530</span>
                <span className="text-sm font-normal text-muted-foreground">.00</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">{new Date().toLocaleString("en-US", { month: "long", year: "numeric" })}</p>
              <p className="text-[11px] font-semibold text-foreground mt-0.5">
                {student.payment_status === "paid" ? t(lang, " ", "") : student.payment_status === "pending" ? t(lang, "Due before 25th", "25-க்குள் செலுத்தவும்") : t(lang, "Payment Overdue", "கட்டணம் தாமதமானது")}
              </p>
            </div>
          </div>
          {studentPayments.length > 0 && (
            <div className="mt-3 border-t border-border/30 pt-3">
              <button onClick={() => setShowHistory(!showHistory)} className="flex items-center justify-between w-full text-xs text-muted-foreground hover:text-foreground transition-colors">
                <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5"><TrendingUp className="w-3 h-3" />{t(lang, "Payment History", "கட்டண வரலாறு")} ({studentPayments.length})</span>
                {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              <AnimatePresence>
                {showHistory && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="pt-2 space-y-1.5">
                      {studentPayments.map(h => (
                        <div key={h.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/20 last:border-0">
                          <span className="text-muted-foreground font-medium">{h.month}</span>
                          <div className="flex items-center gap-2">{h.paid_date && <span className="text-muted-foreground/70">{h.paid_date}</span>}<StatusBadge status={h.status} /></div>
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

      {/* ── PERSONAL DETAILS (open by default + Edit button) ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }} className="glass-card rounded-2xl overflow-hidden">
        <div className="flex items-center px-4 py-3.5">
          <button onClick={() => setShowDetails(!showDetails)} className="flex-1 flex items-center gap-2 hover:opacity-80 transition-opacity text-left">
            <span className="text-sm font-bold text-foreground flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              {t(lang, "Personal Details", "தனிப்பட்ட விவரங்கள்")}
            </span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition-colors px-3 py-1.5 rounded-full"
            >
              <Pencil className="w-3 h-3" />
              {t(lang, "Edit", "திருத்து")}
            </button>
            <button onClick={() => setShowDetails(!showDetails)} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors ml-1">
              <span className="hidden sm:block font-medium">{showDetails ? t(lang, "Hide", "மறை") : t(lang, "View", "பார்")}</span>
              {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showDetails && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="px-4 pb-4 divide-y divide-border/30">
                {hasGender && (
                  <div className="flex items-center gap-3 py-2.5">
                    <GenderIcon className={`w-3.5 h-3.5 flex-shrink-0 ${isMale ? "text-blue-500" : "text-pink-500"}`} />
                    <span className="text-muted-foreground flex-shrink-0 w-20 text-xs">{t(lang, "Gender", "பாலினம்")}</span>
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${isMale ? "bg-blue-500/10 text-blue-600" : "bg-pink-500/10 text-pink-600"}`}>{genderLabel}</span>
                  </div>
                )}
                {([
                  { icon: User,          label: t(lang, "NIC",       "NIC"),          value: student.nic },
                  { icon: Calendar,      label: t(lang, "DOB",       "பிறந்த தேதி"),  value: student.dob },
                  { icon: MapPin,        label: t(lang, "Address",   "முகவரி"),        value: student.address },
                  { icon: Phone,         label: t(lang, "Phone",     "தொலைபேசி"),     value: student.student_phone },
                  { icon: User,          label: t(lang, "Parent",    "பெற்றோர்"),      value: student.parent_name ? `${student.parent_name}${student.parent_phone ? ` (${student.parent_phone})` : ""}` : "-" },
                  { icon: GraduationCap, label: t(lang, "School ID", "பள்ளி ID"),     value: student.school_id },
                ] as const).map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3 py-2.5">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground flex-shrink-0 w-20 text-xs font-medium">{label}</span>
                    <span className="text-foreground text-xs leading-snug break-words min-w-0">{value ?? "-"}</span>
                  </div>
                ))}
                <div className="pt-3">
                  <button onClick={() => setShowEditModal(true)}
                    className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors py-2 rounded-xl border border-dashed border-border hover:border-primary/40">
                    <Pencil className="w-3 h-3" />
                    {t(lang, "Request to edit your details", "உங்கள் விவரங்களை திருத்த கோருங்கள்")}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Online Pay Card */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
        <button onClick={() => setShowPayModal(true)}
          className="w-full glass-card rounded-2xl p-4 flex items-center gap-4 hover:bg-secondary/30 active:scale-[0.98] transition-all text-left group cursor-pointer shadow-sm">
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-md group-hover:shadow-primary/25 transition-shadow"><CreditCard className="w-6 h-6 text-primary-foreground" /></div>
            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center border-2 border-background shadow-sm"><span className="text-white text-[8px] font-black leading-none">!</span></div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-foreground">{t(lang, "Online Payment", "ஆன்லைன் கட்டணம்")}</p>
              <span className="text-[9px] font-black uppercase tracking-widest bg-amber-500/15 text-amber-600 px-2 py-0.5 rounded-full border border-amber-500/20">{t(lang, "Coming Soon", "விரைவில்")}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{t(lang, "Visa · Mastercard · Lanka QR · Bank Transfer", "Visa · Mastercard · Lanka QR · வங்கி பரிமாற்றம்")}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
        </button>
      </motion.div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="glass-card rounded-2xl p-4 space-y-2.5">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-primary" />
            {t(lang, "Announcements", "அறிவிப்புகள்")}
            <span className="ml-auto text-xs bg-primary/15 text-primary px-2 py-0.5 rounded-full font-semibold">{announcements.length}</span>
          </h3>
          <div className="space-y-2">
            {announcements.map(a => (
              <div key={a.id} className={`p-3 rounded-xl bg-secondary text-sm ${a.urgent ? "border-l-2 border-amber-500" : ""}`}>
                <p className="font-semibold text-foreground text-xs leading-snug">{a.title}</p>
                <p className="text-muted-foreground text-xs mt-1 leading-relaxed">{a.message}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
