import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bus, Lock, Eye, EyeOff, ShieldCheck, Mail, AlertCircle, ArrowRight, Sparkles } from "lucide-react";
import ForgotPasswordPage from "./ForgotPasswordPage";

interface Props {
  onLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onSignUp: () => void;
  lang?: "en" | "ta";
}

function FloatDot({ x, y, delay }: { x: number; y: number; delay: number }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%`, width: 3, height: 3, background: "rgba(96,165,250,0.25)" }}
      animate={{ y: [-15, -45, -15], opacity: [0, 0.7, 0], scale: [0.5, 1.3, 0.5] }}
      transition={{ duration: 3.5 + delay, repeat: Infinity, delay, ease: "easeInOut" }}
    />
  );
}

const dots = Array.from({ length: 14 }, (_, i) => ({
  x: (i * 41 + 13) % 100, y: (i * 67 + 5) % 100, delay: i * 0.35,
}));

export default function LoginPage({ onLogin, onSignUp, lang = "en" }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<"email" | "password" | null>(null);
  const [time, setTime] = useState(new Date());
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const ta = (en: string, ta: string) => lang === "ta" ? ta : en;

  const handleLogoTap = () => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      setAdminMode(p => !p);
    } else {
      tapTimerRef.current = setTimeout(() => { tapCountRef.current = 0; }, 1500);
    }
  };

  const handleSubmit = async () => {
    if (!email || !password) return;
    setSubmitting(true);
    setError("");
    const result = await onLogin(email, password);
    if (!result.success) {
      // User-friendly Tamil/English error messages
      const raw = result.error?.toLowerCase() ?? "";
      let msg = result.error ?? ta("Login failed. Check credentials.", "Login தோல்வியடைந்தது.");
      if (raw.includes("invalid login") || raw.includes("invalid credentials") || raw.includes("wrong password")) {
        msg = ta("Incorrect email or password. Please try again.", "Email அல்லது password தவறு. மீண்டும் முயலுங்க.");
      } else if (raw.includes("email not confirmed")) {
        msg = ta("Please confirm your email first. Check your inbox.", "உங்கள் email-ஐ confirm பண்ணுங்க. Inbox check பண்ணுங்க.");
      } else if (raw.includes("too many requests") || raw.includes("rate limit")) {
        msg = ta("Too many attempts. Please wait a moment.", "அதிக முயற்சி. சிறிது நேரம் காத்திருங்க.");
      } else if (raw.includes("network") || raw.includes("fetch")) {
        msg = ta("Network error. Check your connection.", "Network பிரச்சனை. Connection சரிபாருங்க.");
      } else if (raw.includes("user not found") || raw.includes("no user")) {
        msg = ta("No account found with this email. Please sign up.", "இந்த email-ல் account இல்ல. Sign up பண்ணுங்க.");
      }
      setError(msg);
    }
    setSubmitting(false);
  };

  if (showForgotPassword) return <ForgotPasswordPage onBack={() => setShowForgotPassword(false)} lang={lang} />;

  const timeStr = time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  const canSubmit = email.trim() && password.trim() && !submitting;

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: "#060d1f" }}>

      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{
          background: adminMode
            ? "radial-gradient(ellipse 70% 55% at 50% 25%, rgba(220,38,38,0.16) 0%, transparent 65%)"
            : "radial-gradient(ellipse 70% 55% at 50% 25%, rgba(29,78,216,0.18) 0%, transparent 65%), radial-gradient(ellipse 50% 35% at 85% 75%, rgba(99,102,241,0.1) 0%, transparent 60%)",
        }} />
        <div className="absolute inset-0 opacity-[0.032]" style={{
          backgroundImage: "linear-gradient(rgba(147,197,253,1) 1px, transparent 1px), linear-gradient(90deg, rgba(147,197,253,1) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }} />
        <div className="absolute inset-x-0 top-0 h-36" style={{ background: "linear-gradient(to bottom, #060d1f, transparent)" }} />
        <div className="absolute inset-x-0 bottom-0 h-28" style={{ background: "linear-gradient(to top, #060d1f, transparent)" }} />
        {dots.map((d, i) => <FloatDot key={i} x={d.x} y={d.y} delay={d.delay} />)}
      </div>

      {/* Status bar */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="relative z-10 flex items-center justify-between px-5 pt-4 pb-1">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: adminMode ? "#f87171" : "#34d399" }} />
          <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: adminMode ? "rgba(248,113,113,0.75)" : "rgba(52,211,153,0.75)" }}>
            {adminMode ? ta("Admin Mode", "Admin பயன்முறை") : ta("Secure", "பாதுகாப்பான")}
          </span>
        </div>
        <span className="text-[11px] font-mono tracking-wider" style={{ color: "rgba(147,197,253,0.38)" }}>{timeStr}</span>
        <div className="w-16" />
      </motion.div>

      {/* Center content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 pb-6">

        {/* Logo */}
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 18, delay: 0.1 }}
          className="relative mb-6 cursor-pointer select-none" onClick={handleLogoTap}>
          <motion.div animate={{ scale: [1, 1.18, 1], opacity: [0.2, 0.06, 0.2] }}
            transition={{ duration: 2.8, repeat: Infinity }}
            className="absolute rounded-full" style={{ inset: "-20px", background: adminMode ? "rgba(220,38,38,0.2)" : "rgba(59,130,246,0.2)" }} />
          <motion.div whileTap={{ scale: 0.92 }}
            className="w-20 h-20 rounded-[24px] flex items-center justify-center" style={{
              background: adminMode
                ? "linear-gradient(135deg, #991b1b, #ef4444)"
                : "linear-gradient(135deg, #1d4ed8, #3b82f6, #60a5fa)",
              boxShadow: adminMode
                ? "0 0 36px rgba(239,68,68,0.4), 0 8px 28px rgba(0,0,0,0.5)"
                : "0 0 36px rgba(59,130,246,0.4), 0 8px 28px rgba(0,0,0,0.5)",
            }}>
            {adminMode
              ? <ShieldCheck className="w-10 h-10 text-white drop-shadow" />
              : <Bus className="w-10 h-10 text-white drop-shadow" />}
          </motion.div>
          {!adminMode && (
            <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: "#0d1b3e", border: "2px solid rgba(59,130,246,0.4)" }}>
              <Sparkles className="w-3 h-3 text-blue-400" />
            </div>
          )}
        </motion.div>

        {/* Heading */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
          className="text-center mb-6">
          <h1 className="text-[24px] font-black tracking-tight mb-0.5" style={{
            background: adminMode
              ? "linear-gradient(135deg, #fff, #fca5a5, #ef4444)"
              : "linear-gradient(135deg, #ffffff, #93c5fd, #60a5fa)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.02em",
          }}>
            {adminMode ? ta("Admin Sign In", "Admin உள்நுழைவு") : ta("Welcome Back", "மீண்டும் வரவேற்கிறோம்")}
          </h1>
          <p className="text-[12px] font-medium" style={{ color: "rgba(147,197,253,0.5)" }}>
            {adminMode ? ta("Authorized Personnel Only", "அங்கீகரிக்கப்பட்டவர்கள் மட்டும்") : "A.M.V Season Tickets"}
          </p>
        </motion.div>

        {/* Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="w-full max-w-[360px]">
          <div className="rounded-3xl overflow-hidden" style={{
            background: "rgba(13,22,48,0.78)",
            border: adminMode ? "1px solid rgba(239,68,68,0.18)" : "1px solid rgba(59,130,246,0.14)",
            backdropFilter: "blur(24px)",
            boxShadow: "0 28px 56px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 1px 0 rgba(255,255,255,0.06) inset",
          }}>
            <div className="h-px w-full" style={{
              background: adminMode
                ? "linear-gradient(90deg, transparent, rgba(239,68,68,0.6), transparent)"
                : "linear-gradient(90deg, transparent, rgba(59,130,246,0.6), rgba(99,102,241,0.5), transparent)",
            }} />

            <div className="p-6 space-y-3">
              {/* Email input */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold tracking-widest uppercase pl-1"
                  style={{ color: "rgba(147,197,253,0.42)" }}>
                  {ta("Email Address", "மின்னஞ்சல்")}
                </label>
                <motion.div animate={{ scale: focusedField === "email" ? 1.015 : 1 }} transition={{ duration: 0.15 }} className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 z-10 transition-colors duration-200"
                    style={{ color: focusedField === "email" ? (adminMode ? "#f87171" : "#60a5fa") : "rgba(147,197,253,0.25)" }} />
                  <input
                    type="email"
                    placeholder={ta("your@email.com", "மின்னஞ்சல்@இடம்.com")}
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(""); }}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                    onKeyDown={e => e.key === "Enter" && handleSubmit()}
                    className="w-full pl-11 pr-4 rounded-2xl outline-none transition-all duration-200"
                    style={{
                      height: "52px",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#e2e8f0",
                      caretColor: "#60a5fa",
                      background: "rgba(7,13,30,0.65)",
                      border: focusedField === "email"
                        ? `1px solid ${adminMode ? "rgba(239,68,68,0.5)" : "rgba(59,130,246,0.45)"}`
                        : "1px solid rgba(59,130,246,0.12)",
                      boxShadow: focusedField === "email"
                        ? `0 0 0 3px ${adminMode ? "rgba(239,68,68,0.08)" : "rgba(59,130,246,0.1)"}`
                        : "none",
                    }}
                  />
                </motion.div>
              </div>

              {/* Password input */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold tracking-widest uppercase pl-1"
                  style={{ color: "rgba(147,197,253,0.42)" }}>
                  {ta("Password", "கடவுச்சொல்")}
                </label>
                <motion.div animate={{ scale: focusedField === "password" ? 1.015 : 1 }} transition={{ duration: 0.15 }} className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 z-10 transition-colors duration-200"
                    style={{ color: focusedField === "password" ? (adminMode ? "#f87171" : "#60a5fa") : "rgba(147,197,253,0.25)" }} />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder={ta("Enter password", "கடவுச்சொல் உள்ளிடுங்க")}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(""); }}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    onKeyDown={e => e.key === "Enter" && handleSubmit()}
                    className="w-full pl-11 pr-11 rounded-2xl outline-none transition-all duration-200"
                    style={{
                      height: "52px",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#e2e8f0",
                      caretColor: "#60a5fa",
                      background: "rgba(7,13,30,0.65)",
                      border: focusedField === "password"
                        ? `1px solid ${adminMode ? "rgba(239,68,68,0.5)" : "rgba(59,130,246,0.45)"}`
                        : "1px solid rgba(59,130,246,0.12)",
                      boxShadow: focusedField === "password"
                        ? `0 0 0 3px ${adminMode ? "rgba(239,68,68,0.08)" : "rgba(59,130,246,0.1)"}`
                        : "none",
                    }}
                  />
                  <button type="button" onClick={() => setShowPassword(s => !s)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-10 transition-colors"
                    style={{ color: "rgba(147,197,253,0.3)" }}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </motion.div>
              </div>

              {/* Forgot password */}
              <div className="flex justify-end">
                <button type="button" onClick={() => setShowForgotPassword(true)}
                  className="text-[11px] font-semibold transition-colors"
                  style={{ color: adminMode ? "rgba(248,113,113,0.7)" : "rgba(96,165,250,0.7)" }}>
                  {ta("Forgot Password?", "கடவுச்சொல் மறந்தீர்களா?")}
                </button>
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl overflow-hidden"
                    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-red-400" />
                    <p className="text-[11px] font-medium text-red-400">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleSubmit} disabled={!canSubmit}
                className="relative w-full rounded-2xl font-bold text-sm text-white overflow-hidden transition-all"
                style={{
                  height: "52px",
                  background: canSubmit
                    ? adminMode
                      ? "linear-gradient(135deg, #991b1b, #ef4444)"
                      : "linear-gradient(135deg, #1d4ed8, #3b82f6)"
                    : "rgba(30,58,138,0.3)",
                  boxShadow: canSubmit
                    ? adminMode
                      ? "0 8px 24px rgba(239,68,68,0.35)"
                      : "0 8px 24px rgba(59,130,246,0.35)"
                    : "none",
                  opacity: canSubmit ? 1 : 0.45,
                  cursor: canSubmit ? "pointer" : "not-allowed",
                }}>
                {canSubmit && (
                  <motion.div animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.5 }}
                    className="absolute inset-y-0 w-1/3 pointer-events-none"
                    style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)", transform: "skewX(-12deg)" }} />
                )}
                <span className="relative flex items-center justify-center gap-2">
                  {submitting
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{ta("Signing in...", "உள்நுழைகிறது...")}</>
                    : <>{ta("Sign In", "உள்நுழை")}<ArrowRight className="w-4 h-4" /></>}
                </span>
              </motion.button>
            </div>

            {/* Bottom strip */}
            <div className="px-6 py-3.5 flex items-center justify-center gap-1.5" style={{
              borderTop: "1px solid rgba(59,130,246,0.08)", background: "rgba(7,13,30,0.4)",
            }}>
              <p className="text-[11px]" style={{ color: "rgba(147,197,253,0.4)" }}>
                {ta("Don't have an account?", "கணக்கு இல்லையா?")}
              </p>
              <button onClick={onSignUp}
                className="text-[11px] font-bold transition-colors"
                style={{ color: adminMode ? "#f87171" : "#60a5fa" }}>
                {ta("Sign Up", "பதிவு செய்")}
              </button>
            </div>
          </div>
        </motion.div>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85 }}
          className="mt-4 text-[10px] text-center" style={{ color: "rgba(147,197,253,0.2)" }}>
          {ta("A/L Students Only — Akkarayan Maha Vidiyalayam", "உயர்தர மாணவர்கள் மட்டும் — அக்கராயன் மகா வித்தியாலயம்")}
        </motion.p>
      </div>
    </div>
  );
}
