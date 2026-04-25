import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Info, X, ScrollText,
  Mail, MapPin, MessageCircle, Clock, ExternalLink,
  ChevronRight, Lock, FileText, Users, Bell,
  Zap, Code2, Bus, Phone,
} from "lucide-react";

interface Props {
  lang: "en" | "ta";
}

const t = (lang: "en" | "ta", en: string, ta: string) => lang === "en" ? en : ta;

// ─── PRIVACY ───────────────────────────────────────────────
function PrivacyModal({ open, onClose, lang }: { open: boolean; onClose: () => void; lang: "en" | "ta" }) {
  const sections = [
    {
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      heading: t(lang, "Information We Collect", "நாங்கள் சேகரிக்கும் தகவல்கள்"),
      body: t(lang,
        "We collect your name, NIC, date of birth, address, phone number, school ID, parent details and email during registration.",
        "பதிவின்போது பெயர், NIC, பிறந்த தேதி, முகவரி, தொலைபேசி, பள்ளி ID, பெற்றோர் விவரங்கள் மற்றும் மின்னஞ்சல் சேகரிக்கப்படும்."
      ),
    },
    {
      icon: Zap,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      heading: t(lang, "How We Use It", "தகவல் பயன்பாடு"),
      body: t(lang,
        "Your data is used solely for student identification, monthly fee tracking, announcements, and class-wise reporting.",
        "மாணவர் அடையாளம், கட்டண கண்காணிப்பு, அறிவிப்புகள் மற்றும் அறிக்கைகளுக்கு மட்டுமே பயன்படுத்தப்படும்."
      ),
    },
    {
      icon: Lock,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      heading: t(lang, "Admin Access", "Admin அணுகல்"),
      body: t(lang,
        "Only authorized admins can access your personal information. It will never be shared with third parties.",
        "அங்கீகரிக்கப்பட்ட Admin மட்டுமே உங்கள் தகவலை அணுக முடியும். மூன்றாம் தரப்பினருக்கு வழங்கப்பட மாட்டாது."
      ),
    },
    {
      icon: Shield,
      color: "text-violet-500",
      bg: "bg-violet-500/10",
      heading: t(lang, "Data Security", "தரவு பாதுகாப்பு"),
      body: t(lang,
        "All data is securely stored via Supabase with SSL/TLS encryption on all connections.",
        "Supabase மூலம் SSL/TLS குறியாக்கத்துடன் அனைத்து தரவும் பாதுகாப்பாக சேமிக்கப்படும்."
      ),
    },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 80, opacity: 0, scale: 0.97 }} animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 80, opacity: 0 }} transition={{ type: "spring", stiffness: 360, damping: 30 }}
            className="w-full sm:max-w-sm glass-card rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 sm:hidden"><div className="w-10 h-1 rounded-full bg-border" /></div>

            {/* Header */}
            <div className="relative gradient-primary px-6 pt-6 pb-6 overflow-hidden">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 85% 15%, white 0%, transparent 55%)" }} />
              <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">A.M.V Season Tickets</p>
                  <h2 className="text-white font-bold text-lg leading-tight">{t(lang, "Privacy Policy", "தனியுரிமை கொள்கை")}</h2>
                </div>
              </div>
              <p className="text-white/75 text-xs mt-3 leading-relaxed">{t(lang, "Your data is safe with us. Here's how we handle it.", "உங்கள் தரவு எங்களிடம் பாதுகாப்பாக உள்ளது.")}</p>
            </div>

            <div className="px-5 py-4 space-y-2.5 max-h-[55vh] overflow-y-auto">
              {sections.map(({ icon: Icon, color, bg, heading, body }) => (
                <div key={heading} className={`flex gap-3 p-3.5 rounded-2xl ${bg}`}>
                  <div className="w-8 h-8 rounded-xl bg-background/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">{heading}</p>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 pb-5">
              <p className="text-center text-[10px] text-muted-foreground/60">{t(lang, "Last updated: April 2026", "கடைசியாக புதுப்பிக்கப்பட்டது: April 2026")}</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── RULES ─────────────────────────────────────────────────
function RulesModal({ open, onClose, lang }: { open: boolean; onClose: () => void; lang: "en" | "ta" }) {
  const rules = [
    { num: "01", heading: t(lang, "Eligibility", "தகுதி"), body: t(lang, "Exclusively for A/L students of Akkarayan Maha Vidiyalayam. Valid school ID required.", "Akkarayan Maha Vidiyalayam A/L மாணவர்களுக்கு மட்டுமே. Valid பள்ளி ID தேவை.") },
    { num: "02", heading: t(lang, "Monthly Fee", "மாதாந்திர கட்டணம்"), body: t(lang, "Fees must be paid before the 10th of each month. Late payments may restrict access.", "ஒவ்வொரு மாதமும் 10-ஆம் தேதிக்குள் கட்டணம் செலுத்தணும். தாமதம் ஆனால் அணுகல் கட்டுப்படும்.") },
    { num: "03", heading: t(lang, "Account Security", "கணக்கு பாதுகாப்பு"), body: t(lang, "Keep login credentials secure. Sharing accounts is strictly prohibited.", "Login credentials பாதுகாப்பாக வைக்கவும். கணக்கை பகிர்வது கண்டிப்பாக தடை.") },
    { num: "04", heading: t(lang, "Conduct", "நடத்தை"), body: t(lang, "Misuse or false information will result in immediate account suspension.", "தவறான தகவல் அல்லது துஷ்பிரயோகம் கணக்கை உடனடியாக நிறுத்தும்.") },
    { num: "05", heading: t(lang, "Permission Letter", "அனுமதி கடிதம்"), body: t(lang, "2028 & 2029 batch students must upload a signed parent permission letter.", "2028 மற்றும் 2029 batch மாணவர்கள் பெற்றோர் கையொப்பமிட்ட கடிதம் upload பண்ணணும்.") },
    { num: "06", heading: t(lang, "Disputes", "தகராறுகள்"), body: t(lang, "All disputes are subject to Admin's decision. Use the messaging feature for contact.", "அனைத்து தகராறுகளும் Admin முடிவுக்கு உட்பட்டவை.") },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 80, opacity: 0, scale: 0.97 }} animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 80, opacity: 0 }} transition={{ type: "spring", stiffness: 360, damping: 30 }}
            className="w-full sm:max-w-sm glass-card rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 sm:hidden"><div className="w-10 h-1 rounded-full bg-border" /></div>

            <div className="relative gradient-primary px-6 pt-6 pb-6 overflow-hidden">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 85% 15%, white 0%, transparent 55%)" }} />
              <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
                  <ScrollText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">A.M.V Season Tickets</p>
                  <h2 className="text-white font-bold text-lg leading-tight">{t(lang, "Rules & Regulations", "விதிகள் மற்றும் ஒழுங்குமுறைகள்")}</h2>
                </div>
              </div>
              <p className="text-white/75 text-xs mt-3">{t(lang, "Please read and follow all rules carefully.", "அனைத்து விதிகளையும் கவனமாக படிக்கவும்.")}</p>
            </div>

            <div className="px-5 py-4 space-y-2 max-h-[55vh] overflow-y-auto">
              {rules.map(({ num, heading, body }) => (
                <div key={num} className="flex gap-3 p-3.5 rounded-2xl bg-secondary/50 hover:bg-secondary/80 transition-colors">
                  <span className="text-[11px] font-black text-primary/50 mt-0.5 w-5 flex-shrink-0">{num}</span>
                  <div>
                    <p className="text-xs font-bold text-foreground">{heading}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{body}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0 mt-0.5 ml-auto" />
                </div>
              ))}
            </div>
            <div className="px-5 pb-5">
              <p className="text-center text-[10px] text-muted-foreground/60">{t(lang, "Rules may be updated. Check announcements.", "விதிகள் மாறலாம். அறிவிப்புகளை பாருங்கள்.")}</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── ABOUT ─────────────────────────────────────────────────
function AboutModal({ open, onClose, lang }: { open: boolean; onClose: () => void; lang: "en" | "ta" }) {
  const features = [
    { icon: Bell,     color: "text-amber-500",  bg: "bg-amber-500/10",  label: t(lang, "Real-time announcements", "Real-time அறிவிப்புகள்") },
    { icon: Shield,   color: "text-emerald-500", bg: "bg-emerald-500/10",label: t(lang, "Secure authentication", "பாதுகாப்பான login") },
    { icon: FileText, color: "text-blue-500",    bg: "bg-blue-500/10",   label: t(lang, "Batch-wise reports", "Batch அறிக்கைகள்") },
    { icon: Zap,      color: "text-violet-500",  bg: "bg-violet-500/10", label: t(lang, "Instant payment tracking", "உடனடி கட்டண கண்காணிப்பு") },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 80, opacity: 0, scale: 0.97 }} animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 80, opacity: 0 }} transition={{ type: "spring", stiffness: 360, damping: 30 }}
            className="w-full sm:max-w-sm glass-card rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 sm:hidden"><div className="w-10 h-1 rounded-full bg-border" /></div>

            <div className="relative gradient-primary px-6 pt-6 pb-6 overflow-hidden">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 85% 15%, white 0%, transparent 55%)" }} />
              <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Bus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">A.M.V Season Tickets</p>
                  <h2 className="text-white font-bold text-lg leading-tight">{t(lang, "About", "எங்களைப் பற்றி")}</h2>
                </div>
              </div>
              <p className="text-white/80 text-xs mt-3 leading-relaxed">
                {t(lang, "A digital student management system for Akkarayan Maha Vidiyalayam A/L students.", "Akkarayan Maha Vidiyalayam A/L மாணவர்களுக்கான digital மேலாண்மை system.")}
              </p>
            </div>

            <div className="px-5 py-4 space-y-3">
              {/* Feature grid */}
              <div className="grid grid-cols-2 gap-2">
                {features.map(({ icon: Icon, color, bg, label }) => (
                  <div key={label} className={`flex items-center gap-2 p-3 rounded-2xl ${bg}`}>
                    <Icon className={`w-4 h-4 ${color} flex-shrink-0`} />
                    <p className="text-[11px] font-semibold text-foreground leading-tight">{label}</p>
                  </div>
                ))}
              </div>

              {/* Tech stack */}
              <div className="p-3.5 rounded-2xl bg-secondary/60">
                <div className="flex items-center gap-2 mb-2">
                  <Code2 className="w-3.5 h-3.5 text-primary" />
                  <p className="text-[11px] font-bold text-foreground uppercase tracking-wider">{t(lang, "Built With", "தொழில்நுட்பம்")}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {["React", "TypeScript", "Tailwind CSS", "Supabase"].map(tech => (
                    <span key={tech} className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">{tech}</span>
                  ))}
                </div>
              </div>

              {/* Version */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary/40">
                <span className="text-xs text-muted-foreground">{t(lang, "Version", "பதிப்பு")}</span>
                <span className="text-xs font-bold text-foreground">v1.0 · April 2026</span>
              </div>
            </div>

            <div className="px-5 pb-5">
              <p className="text-center text-[10px] text-muted-foreground/60">{t(lang, "Designed for Akkarayan Maha Vidiyalayam", "Akkarayan Maha Vidiyalayam-க்காக வடிவமைக்கப்பட்டது")}</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── CONTACT ───────────────────────────────────────────────
function ContactModal({ open, onClose, lang }: { open: boolean; onClose: () => void; lang: "en" | "ta" }) {
  const contacts = [
    {
      icon: Mail,
      label: t(lang, "Email", "மின்னஞ்சல்"),
      value: t(lang, "Contact email Season admin", "Season admin மின்னஞ்சல்"),
      sub: t(lang, "Best for detailed queries", "விரிவான கேள்விகளுக்கு சிறந்தது"),
      href: "mailto:rkathir172@gmail.com",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      icon: MessageCircle,
      label: t(lang, "WhatsApp / Phone", "WhatsApp / தொலைபேசி"),
      value: t(lang, "Contact via Season admin", "Season நிர்வாகி மூலம் தொடர்பு"),
      sub: t(lang, "Monday – Friday · 7.30 AM – 1.30 PM", "திங்கள் – வெள்ளி · காலை 7:30 – பகல் 1:30"),
      href: "https://wa.me/94772734400",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    {
      icon: MapPin,
      label: t(lang, "School Address", "பள்ளி முகவரி"),
      value: "Akkarayan Maha Vidiyalayam",
      sub: "Akkarayankulam, Kilinochchi.",
      href: "https://maps.google.com/?q=Akkarayan+Maha+Vidiyalayam+Kilinochchi",
      color: "text-rose-500",
      bg: "bg-rose-500/10",
      border: "border-rose-500/20",
    },
    {
      icon: Clock,
      label: t(lang, "Office Hours", "அலுவலக நேரம்"),
      value: t(lang, "Monday – Friday", "திங்கள் – வெள்ளி"),
      sub: t(lang, "7:30 AM – 3:30 PM", "காலை 7:30 – மாலை 3:30"),
      href: null as string | null,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 80, opacity: 0, scale: 0.97 }} animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 80, opacity: 0 }} transition={{ type: "spring", stiffness: 360, damping: 30 }}
            className="w-full sm:max-w-sm glass-card rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 sm:hidden"><div className="w-10 h-1 rounded-full bg-border" /></div>

            <div className="relative gradient-primary px-6 pt-6 pb-6 overflow-hidden">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 85% 15%, white 0%, transparent 55%)" }} />
              <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">A.M.V Season Tickets</p>
                  <h2 className="text-white font-bold text-lg leading-tight">{t(lang, "Contact Us", "எங்களை தொடர்பு கொள்ளுங்கள்")}</h2>
                </div>
              </div>
              <p className="text-white/80 text-xs mt-3">{t(lang, "We're here to help. Reach out anytime.", "நாங்கள் உதவ தயாராக இருக்கிறோம்.")}</p>
            </div>

            <div className="px-5 py-4 space-y-2.5">
              {contacts.map(({ icon: Icon, label, value, sub, href, color, bg, border }) => {
                const Inner = (
                  <div className={`flex items-center gap-3 p-3.5 rounded-2xl ${bg} border ${border} hover:brightness-95 transition-all group`}>
                    <div className="w-10 h-10 rounded-xl bg-background/60 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Icon className={`w-[18px] h-[18px] ${color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
                      <p className="text-sm font-semibold text-foreground leading-tight mt-0.5">{value}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
                    </div>
                    {href && <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-foreground flex-shrink-0 transition-colors" />}
                  </div>
                );
                return href ? (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="block">{Inner}</a>
                ) : (
                  <div key={label}>{Inner}</div>
                );
              })}
            </div>

            <div className="px-5 pb-5">
              <p className="text-center text-[11px] text-muted-foreground leading-relaxed">
                {t(lang, "For account issues, use the messaging feature in your dashboard.", "கணக்கு சிக்கல்களுக்கு, dashboard-ல் உள்ள messaging feature பயன்படுத்துங்கள்.")}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── FOOTER BAR ────────────────────────────────────────────
type ModalType = "privacy" | "rules" | "about" | "contact" | null;

export default function FooterBar({ lang }: Props) {
  const [open, setOpen] = useState<ModalType>(null);

  const navItems = [
    { key: "privacy" as ModalType,  icon: Shield,        labelEn: "Privacy",  labelTa: "தனியுரிமை",  color: "text-violet-500",  activeBg: "bg-violet-500/10" },
    { key: "rules"   as ModalType,  icon: ScrollText,    labelEn: "Rules",    labelTa: "விதிகள்",    color: "text-rose-500",    activeBg: "bg-rose-500/10" },
    { key: "about"   as ModalType,  icon: Info,          labelEn: "About",    labelTa: "பற்றி",      color: "text-sky-500",     activeBg: "bg-sky-500/10" },
    { key: "contact" as ModalType,  icon: MessageCircle, labelEn: "Contact",  labelTa: "தொடர்பு",   color: "text-emerald-500", activeBg: "bg-emerald-500/10" },
  ];

  return (
    <>
      <PrivacyModal  open={open === "privacy"}  onClose={() => setOpen(null)} lang={lang} />
      <RulesModal    open={open === "rules"}    onClose={() => setOpen(null)} lang={lang} />
      <AboutModal    open={open === "about"}    onClose={() => setOpen(null)} lang={lang} />
      <ContactModal  open={open === "contact"}  onClose={() => setOpen(null)} lang={lang} />

      <footer className="sticky bottom-0 z-40 glass-card border-t border-border/40 backdrop-blur-xl">
        <div className="flex items-center justify-around h-14 px-2 max-w-lg mx-auto">
          {navItems.map(({ key, icon: Icon, labelEn, labelTa, color, activeBg }) => {
            const isActive = open === key;
            return (
              <button
                key={key}
                onClick={() => setOpen(isActive ? null : key)}
                className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all active:scale-95 ${
                  isActive ? `${activeBg} ${color}` : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`w-4.5 h-4.5 transition-transform ${isActive ? "scale-110" : ""}`} style={{ width: "18px", height: "18px" }} />
                <span className={`text-[10px] font-semibold leading-none ${isActive ? color : ""}`}>
                  {lang === "en" ? labelEn : labelTa}
                </span>
              </button>
            );
          })}
        </div>
      </footer>
    </>
  );
}
