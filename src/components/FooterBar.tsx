import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Info, X, ScrollText,
  Mail, Phone, MapPin, MessageCircle, Clock, ExternalLink,
} from "lucide-react";

interface Props {
  lang: "en" | "ta";
}

const content = {
  privacy: {
    en: {
      title: "Privacy Policy",
      sections: [
        { heading: "1. Information We Collect", body: "We collect your name, NIC, date of birth, address, phone number, school ID, parent details and email during registration." },
        { heading: "2. How We Use It", body: "Your data is used solely for student identification, monthly fee tracking, announcements, and class-wise reporting." },
        { heading: "3. Admin Access", body: "Only authorized admins can access your personal information. It will never be shared with third parties." },
        { heading: "4. Payment Info", body: "Only payment status (Paid / Pending / Late) is recorded. No bank or card details are stored." },
        { heading: "5. Data Security", body: "All data is securely stored via Supabase with SSL/TLS encryption on all connections." },
        { heading: "6. Your Rights", body: "You may request corrections or deletion of your data by contacting the admin." },
        { heading: "7. Contact", body: "Questions? Reach us at hiphoptamizhakavi@gmail.com" },
      ],
    },
    ta: {
      title: "தனியுரிமை கொள்கை",
      sections: [
        { heading: "1. நாங்கள் சேகரிக்கும் தகவல்கள்", body: "பதிவின்போது பெயர், NIC, பிறந்த தேதி, முகவரி, தொலைபேசி எண், பள்ளி ID, பெற்றோர் விவரங்கள் மற்றும் மின்னஞ்சல் சேகரிக்கப்படும்." },
        { heading: "2. தகவல் பயன்பாடு", body: "மாணவர் அடையாளம், கட்டண கண்காணிப்பு, அறிவிப்புகள் மற்றும் அறிக்கைகளுக்கு மட்டுமே உங்கள் தகவல் பயன்படுத்தப்படும்." },
        { heading: "3. Admin அணுகல்", body: "அங்கீகரிக்கப்பட்ட Admin மட்டுமே உங்கள் தகவலை அணுக முடியும். மூன்றாம் தரப்பினருக்கு வழங்கப்பட மாட்டாது." },
        { heading: "4. கட்டண தகவல்", body: "கட்டண நிலை மட்டுமே பதிவு செய்யப்படும். வங்கி அல்லது அட்டை விவரங்கள் சேமிக்கப்படாது." },
        { heading: "5. தரவு பாதுகாப்பு", body: "Supabase மூலம் SSL/TLS குறியாக்கத்துடன் அனைத்து தரவும் பாதுகாப்பாக சேமிக்கப்படும்." },
        { heading: "6. உங்கள் உரிமைகள்", body: "தரவை திருத்த அல்லது நீக்க Admin-ஐ தொடர்பு கொள்ளலாம்." },
        { heading: "7. தொடர்பு", body: "கேள்விகளுக்கு: hiphoptamizhakavi@gmail.com" },
      ],
    },
  },
  rules: {
    en: {
      title: "Rules & Regulations",
      sections: [
        { heading: "1. Eligibility", body: "This system is exclusively for A/L students of Akkarayan Maha Vidiyalayam. Registration requires a valid school ID." },
        { heading: "2. Monthly Fee Payment", body: "Fees must be paid before the 10th of each month. Late payments will be marked and may result in restricted access." },
        { heading: "3. Account Responsibility", body: "Students are responsible for keeping their login credentials secure. Sharing accounts is strictly prohibited." },
        { heading: "4. Conduct", body: "Any misuse of the platform, false information, or disruptive behaviour will result in immediate account suspension." },
        { heading: "5. Permission Letter", body: "Students in the 2028 and 2029 batches must upload a signed parent permission letter during registration." },
        { heading: "6. Updates", body: "Rules may be updated at any time. Students will be notified via the announcements section." },
        { heading: "7. Disputes", body: "All disputes are subject to the decision of the Admin. Students may contact admin via the messaging feature." },
      ],
    },
    ta: {
      title: "விதிகள் மற்றும் ஒழுங்குமுறைகள்",
      sections: [
        { heading: "1. தகுதி", body: "இந்த system Akkarayan Maha Vidiyalayam A/L மாணவர்களுக்கு மட்டுமே. பதிவுக்கு valid பள்ளி ID தேவை." },
        { heading: "2. மாதாந்திர கட்டணம்", body: "ஒவ்வொரு மாதமும் 10-ஆம் தேதிக்குள் கட்டணம் செலுத்தணும். தாமதம் ஆனால் Late என்று குறிக்கப்படும்." },
        { heading: "3. கணக்கு பொறுப்பு", body: "Login credentials-ஐ பாதுகாப்பாக வைக்க மாணவர்கள் பொறுப்பு. கணக்கை பகிர்வது கண்டிப்பாக தடை." },
        { heading: "4. நடத்தை", body: "தவறான தகவல் அல்லது platform துஷ்பிரயோகம் கணக்கை உடனடியாக நிறுத்த வழிவகுக்கும்." },
        { heading: "5. அனுமதி கடிதம்", body: "2028 மற்றும் 2029 batch மாணவர்கள் பெற்றோர் கையொப்பமிட்ட கடிதம் upload பண்ணணும்." },
        { heading: "6. புதுப்பிப்புகள்", body: "விதிகள் எப்போதும் மாறலாம். அறிவிப்பு பகுதி மூலம் தெரிவிக்கப்படும்." },
        { heading: "7. தகராறுகள்", body: "அனைத்து தகராறுகளும் Admin முடிவுக்கு உட்பட்டவை. Message feature மூலம் Admin-ஐ தொடர்பு கொள்ளலாம்." },
      ],
    },
  },
  about: {
    en: {
      title: "About",
      sections: [
        { heading: "A.M.V Season Tickets", body: "A digital student management system built exclusively for Akkarayan Maha Vidiyalayam Advanced Level students." },
        { heading: "Purpose", body: "This platform simplifies monthly fee tracking, student record management, and admin-student communication in one place." },
        { heading: "Features", body: "Real-time payment status, announcements, audit logs, student profiles, batch-wise reports, and secure authentication." },
        { heading: "Technology", body: "Built with React, TypeScript, Tailwind CSS, and Supabase — delivering a fast, secure, and modern experience." },
        { heading: "Version", body: "v1.0 — April 2026" },
        { heading: "Developer", body: "Designed & developed for Akkarayan Maha Vidiyalayam. For support: hiphoptamizhakavi@gmail.com" },
      ],
    },
    ta: {
      title: "எங்களைப் பற்றி",
      sections: [
        { heading: "A.M.V Season Tickets", body: "Akkarayan Maha Vidiyalayam A/L மாணவர்களுக்காக உருவாக்கப்பட்ட digital மாணவர் மேலாண்மை system." },
        { heading: "நோக்கம்", body: "மாதாந்திர கட்டண கண்காணிப்பு, மாணவர் பதிவுகள் மற்றும் admin-மாணவர் தொடர்பை ஒரே இடத்தில் எளிமைப்படுத்துகிறது." },
        { heading: "வசதிகள்", body: "Real-time கட்டண நிலை, அறிவிப்புகள், audit log, மாணவர் profile, batch அறிக்கைகள் மற்றும் பாதுகாப்பான login." },
        { heading: "தொழில்நுட்பம்", body: "React, TypeScript, Tailwind CSS மற்றும் Supabase-ஐ பயன்படுத்தி வேகமான, பாதுகாப்பான அனுபவம் வழங்கப்படுகிறது." },
        { heading: "Version", body: "v1.0 — April 2026" },
        { heading: "Developer", body: "Akkarayan Maha Vidiyalayam-க்காக வடிவமைக்கப்பட்டது. உதவிக்கு: hiphoptamizhakavi@gmail.com" },
      ],
    },
  },
};

type ModalType = "privacy" | "rules" | "about" | "contact" | null;

// ── Contact modal content (separate, rich UI) ─────────────
function ContactModal({ open, onClose, lang }: { open: boolean; onClose: () => void; lang: "en" | "ta" }) {
  const t = (en: string, ta: string) => lang === "en" ? en : ta;

  const contacts = [
    {
      icon: Mail,
      label: t("Email", "மின்னஞ்சல்"),
      value: "hiphoptamizhakavi@gmail.com",
      sub: t("Best for detailed queries", "விரிவான கேள்விகளுக்கு சிறந்தது"),
      href: "mailto:hiphoptamizhakavi@gmail.com",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      icon: MessageCircle,
      label: t("WhatsApp / Phone", "WhatsApp / தொலைபேசி"),
      value: t("Contact via school admin", "பள்ளி நிர்வாகி மூலம் தொடர்பு"),
      sub: t("Mon – Sat · 8 AM – 5 PM", "திங்கள் – சனி · காலை 8 – மாலை 5"),
      href: null,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      icon: MapPin,
      label: t("School Address", "பள்ளி முகவரி"),
      value: "Akkarayan Maha Vidiyalayam",
      sub: "Akkarayankulam, Kilinochchi.",
      href: "https://maps.google.com/?q=Akkarayan+Maha+Vidiyalayam+Kilinochchi",
      color: "text-rose-500",
      bg: "bg-rose-500/10",
    },
    {
      icon: Clock,
      label: t("Office Hours", "அலுவலக நேரம்"),
      value: t("Monday – Friday", "திங்கள் – வெள்ளி"),
      sub: t("7:30 AM – 3:30 PM", "காலை 7:30 – மாலை 3:30"),
      href: null,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            className="w-full sm:max-w-sm glass-card rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Mobile handle */}
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            {/* Gradient header */}
            <div className="relative gradient-primary px-6 pt-6 pb-8 overflow-hidden">
              <div
                className="absolute inset-0 opacity-15"
                style={{ backgroundImage: "radial-gradient(circle at 20% 80%, white 0%, transparent 60%)" }}
              />
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">A.M.V Season Tickets</p>
                  <h2 className="text-white font-bold text-lg leading-tight">
                    {t("Contact Us", "எங்களை தொடர்பு கொள்ளுங்கள்")}
                  </h2>
                </div>
              </div>
              <p className="text-white/75 text-xs mt-3 leading-relaxed">
                {t(
                  "We're here to help. Reach out through any channel below.",
                  "நாங்கள் உதவ தயாராக இருக்கிறோம். கீழே உள்ள எந்த வழியிலும் தொடர்பு கொள்ளலாம்."
                )}
              </p>
            </div>

            {/* Contact cards */}
            <div className="px-5 py-4 space-y-3">
              {contacts.map(({ icon: Icon, label, value, sub, href, color, bg }) => {
                const Inner = (
                  <div className={`flex items-center gap-3 p-3.5 rounded-2xl ${bg} border border-transparent hover:border-border/30 transition-all group`}>
                    <div className={`w-10 h-10 rounded-xl bg-background/60 flex items-center justify-center flex-shrink-0 shadow-sm`}>
                      <Icon className={`w-4.5 h-4.5 ${color}`} style={{ width: "18px", height: "18px" }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
                      <p className="text-sm font-semibold text-foreground leading-tight mt-0.5 break-all">{value}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
                    </div>
                    {href && <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground flex-shrink-0 transition-colors" />}
                  </div>
                );
                return href ? (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="block">
                    {Inner}
                  </a>
                ) : (
                  <div key={label}>{Inner}</div>
                );
              })}
            </div>

            {/* Footer note */}
            <div className="px-5 pb-6">
              <p className="text-center text-[11px] text-muted-foreground leading-relaxed">
                {t(
                  "For account issues, use the messaging feature inside your dashboard.",
                  "கணக்கு சிக்கல்களுக்கு, உங்கள் dashboard-ல் உள்ள messaging feature பயன்படுத்துங்கள்."
                )}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function FooterBar({ lang }: Props) {
  const [open, setOpen] = useState<ModalType>(null);

  const navItems: { key: ModalType; icon: typeof Shield; labelEn: string; labelTa: string }[] = [
    { key: "privacy",  icon: Shield,          labelEn: "Privacy",   labelTa: "தனியுரிமை" },
    { key: "rules",    icon: ScrollText,       labelEn: "Rules",     labelTa: "விதிகள்" },
    { key: "about",    icon: Info,             labelEn: "About",     labelTa: "பற்றி" },
    { key: "contact",  icon: MessageCircle,    labelEn: "Contact",   labelTa: "தொடர்பு" },
  ];

  const activeContent = open && open !== "contact" ? content[open as keyof typeof content]?.[lang] : null;

  return (
    <>
      {/* Generic modal (privacy / rules / about) */}
      <AnimatePresence>
        {open && open !== "contact" && activeContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
            onClick={() => setOpen(null)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="w-full sm:max-w-lg glass-card rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-center pt-3 sm:hidden">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="text-base font-bold text-foreground">{activeContent.title}</h2>
                <button
                  onClick={() => setOpen(null)}
                  className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-6 py-4 overflow-y-auto max-h-[60vh] space-y-4 text-sm leading-relaxed">
                {activeContent.sections.map((s, i) => (
                  <div key={i}>
                    <h3 className="font-semibold text-foreground mb-1">{s.heading}</h3>
                    <p className="text-muted-foreground">{s.body}</p>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground/50 pt-2 border-t border-border">
                  {lang === "en" ? "Last updated: April 2026 • Akkarayan Maha Vidiyalayam" : "கடைசியாக புதுப்பிக்கப்பட்டது: April 2026 • Akkarayan Maha Vidiyalayam"}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ✅ FIX 4 — Rich Contact modal */}
      <ContactModal open={open === "contact"} onClose={() => setOpen(null)} lang={lang} />

      {/* Footer bar */}
      <footer className="sticky bottom-0 z-40 glass-card border-t border-border/50">
        <div className="container mx-auto flex items-center justify-center gap-0.5 h-12 px-2">
          {navItems.map(({ key, icon: Icon, labelEn, labelTa }, idx) => (
            <div key={key} className="flex items-center">
              <button
                onClick={() => setOpen(open === key ? null : key)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  open === key
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{lang === "en" ? labelEn : labelTa}</span>
              </button>
              {idx < navItems.length - 1 && (
                <span className="text-border text-xs mx-0.5">|</span>
              )}
            </div>
          ))}
        </div>
      </footer>
    </>
  );
}
