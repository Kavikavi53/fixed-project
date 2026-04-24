import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, BookOpen, Info, X, ScrollText } from "lucide-react";

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
        { heading: "7. Contact", body: "Questions? Reach us at hiphoptamizchakavi@gmail.com" },
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
        { heading: "7. தொடர்பு", body: "கேள்விகளுக்கு: hiphoptamizchakavi@gmail.com" },
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
        { heading: "Contact", body: "For support or queries: hiphoptamizchakavi@gmail.com" },
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
        { heading: "தொடர்பு", body: "உதவிக்கு: hiphoptamizchakavi@gmail.com" },
      ],
    },
  },
};

type ModalType = "privacy" | "rules" | "about" | null;

export default function FooterBar({ lang }: Props) {
  const [open, setOpen] = useState<ModalType>(null);

  const l = lang;

  const navItems: { key: ModalType; icon: typeof Shield; labelEn: string; labelTa: string }[] = [
    { key: "privacy", icon: Shield, labelEn: "Privacy Policy", labelTa: "தனியுரிமை" },
    { key: "rules", icon: ScrollText, labelEn: "Rules & Regulations", labelTa: "விதிகள்" },
    { key: "about", icon: Info, labelEn: "About", labelTa: "எங்களைப் பற்றி" },
  ];

  const activeContent = open ? content[open][l] : null;

  return (
    <>
      {/* Modal */}
      <AnimatePresence>
        {open && activeContent && (
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
              {/* Handle bar (mobile) */}
              <div className="flex justify-center pt-3 sm:hidden">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="text-base font-bold text-foreground">{activeContent.title}</h2>
                <button
                  onClick={() => setOpen(null)}
                  className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="px-6 py-4 overflow-y-auto max-h-[60vh] space-y-4 text-sm leading-relaxed">
                {activeContent.sections.map((s, i) => (
                  <div key={i}>
                    <h3 className="font-semibold text-foreground mb-1">{s.heading}</h3>
                    <p className="text-muted-foreground">{s.body}</p>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground/50 pt-2 border-t border-border">
                  {l === "en" ? "Last updated: April 2026 • Akkarayan Maha Vidiyalayam" : "கடைசியாக புதுப்பிக்கப்பட்டது: April 2026 • Akkarayan Maha Vidiyalayam"}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer bar */}
      <footer className="sticky bottom-0 z-40 glass-card border-t border-border/50">
        <div className="container mx-auto flex items-center justify-center gap-1 h-12 px-4">
          {navItems.map(({ key, icon: Icon, labelEn, labelTa }, idx) => (
            <div key={key} className="flex items-center">
              <button
                onClick={() => setOpen(open === key ? null : key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  open === key
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{l === "en" ? labelEn : labelTa}</span>
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
