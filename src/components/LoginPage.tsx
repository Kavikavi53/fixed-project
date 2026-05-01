import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Eye, EyeOff, Mail, AlertCircle, ArrowRight, Bus, Shield } from "lucide-react";
import ForgotPasswordPage from "./ForgotPasswordPage";

interface Props {
  onLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onSignUp: () => void;
  lang?: "en" | "ta";
}

export default function LoginPage({ onLogin, onSignUp, lang = "en" }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [currentLang, setCurrentLang] = useState<"en" | "ta">(lang);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  const ta = (en: string, ta: string) => currentLang === "ta" ? ta : en;

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleSubmit = async () => {
    if (!email || !password) return;
    setSubmitting(true);
    setError("");
    const result = await onLogin(email, password);
    if (!result.success) {
      const raw = result.error?.toLowerCase() ?? "";
      let msg = result.error ?? ta("Login failed.", "Login தோல்வியடைந்தது.");
      if (raw.includes("invalid login") || raw.includes("invalid credentials")) {
        msg = ta("Incorrect email or password.", "Email அல்லது password தவறு.");
      } else if (raw.includes("email not confirmed")) {
        msg = ta("Please confirm your email first.", "உங்கள் email-ஐ confirm பண்ணுங்க.");
      } else if (raw.includes("too many requests") || raw.includes("rate limit")) {
        msg = ta("Too many attempts. Please wait.", "அதிக முயற்சி. காத்திருங்க.");
      } else if (raw.includes("network") || raw.includes("fetch")) {
        msg = ta("Network error. Check connection.", "Network பிரச்சனை.");
      }
      setError(msg);
    }
    setSubmitting(false);
  };

  if (showForgotPassword) return <ForgotPasswordPage onBack={() => setShowForgotPassword(false)} lang={currentLang} />;

  const canSubmit = email.trim() && password.trim() && !submitting;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "#020817" }}
    >
      {/* Mouse-follow glow */}
      <div
        className="absolute inset-0 transition-all duration-700 ease-out pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 60% 50% at ${mousePos.x}% ${mousePos.y}%, rgba(99,102,241,0.12) 0%, transparent 70%)`,
        }}
      />

      {/* Corner glows */}
      <div className="absolute top-0 left-0 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)", transform: "translate(-30%, -30%)" }} />
      <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(168,85,247,0.07) 0%, transparent 70%)", transform: "translate(30%, 30%)" }} />

      {/* Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }} />

      {/* Floating particles */}
      {[
        { x: 15, y: 20, size: 4, delay: 0 },
        { x: 80, y: 15, size: 3, delay: 1 },
        { x: 90, y: 70, size: 5, delay: 2 },
        { x: 10, y: 80, size: 3, delay: 0.5 },
        { x: 50, y: 90, size: 4, delay: 1.5 },
        { x: 70, y: 40, size: 2, delay: 3 },
      ].map((orb, i) => (
        <motion.div key={i} className="absolute rounded-full pointer-events-none"
          style={{ left: `${orb.x}%`, top: `${orb.y}%`, width: orb.size, height: orb.size, background: "rgba(129,140,248,0.6)" }}
          animate={{ y: [-20, -50, -20], opacity: [0, 0.8, 0] }}
          transition={{ duration: 4 + orb.delay, repeat: Infinity, delay: orb.delay, ease: "easeInOut" }}
        />
      ))}

      {/* Lang toggle */}
      <motion.button
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        onClick={() => setCurrentLang(l => l === "en" ? "ta" : "en")}
        className="fixed top-5 right-5 z-50 px-4 py-1.5 rounded-full text-xs font-bold"
        style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", color: "#a5b4fc", backdropFilter: "blur(12px)" }}
      >
        {currentLang === "en" ? "தமிழ்" : "English"}
      </motion.button>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[420px]"
      >
        {/* Card outer glow */}
        <div className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.08))", filter: "blur(20px)", transform: "scale(1.05)" }} />

        <div className="relative rounded-3xl overflow-hidden"
          style={{
            background: "rgba(10,14,30,0.85)",
            border: "1px solid rgba(99,102,241,0.2)",
            backdropFilter: "blur(32px)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset",
          }}
        >
          {/* Top shimmer */}
          <div className="h-px w-full"
            style={{ background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.8), rgba(168,85,247,0.6), transparent)" }} />

          <div className="p-8 space-y-7">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", boxShadow: "0 8px 24px rgba(99,102,241,0.4)" }}>
                <Bus className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-white">
                  {ta("Welcome Back", "மீண்டும் வரவேற்கிறோம்")}
                </h1>
                <p className="text-xs mt-0.5" style={{ color: "rgba(148,163,184,0.6)" }}>
                  A.M.V Season Tickets
                </p>
              </div>
              <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                <Shield className="w-3 h-3 text-green-400" />
                <span className="text-[9px] font-bold text-green-400 tracking-widest">SECURE</span>
              </div>
            </motion.div>

            <div className="h-px" style={{ background: "rgba(99,102,241,0.1)" }} />

            {/* Form */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="space-y-4">

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold tracking-widest uppercase pl-1"
                  style={{ color: "rgba(148,163,184,0.5)" }}>
                  {ta("Email Address", "மின்னஞ்சல்")}
                </label>
                <motion.div animate={{ scale: focusedField === "email" ? 1.01 : 1 }} transition={{ duration: 0.15 }} className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200"
                    style={{ color: focusedField === "email" ? "#818cf8" : "rgba(148,163,184,0.3)" }} />
                  <input
                    type="email" placeholder="your@email.com" value={email}
                    onChange={e => { setEmail(e.target.value); setError(""); }}
                    onFocus={() => setFocusedField("email")} onBlur={() => setFocusedField(null)}
                    onKeyDown={e => e.key === "Enter" && handleSubmit()}
                    className="w-full pl-11 pr-4 rounded-2xl outline-none transition-all duration-200 text-sm font-medium"
                    style={{
                      height: "52px",
                      background: "rgba(7,11,26,0.7)",
                      border: focusedField === "email" ? "1px solid rgba(99,102,241,0.6)" : "1px solid rgba(99,102,241,0.12)",
                      boxShadow: focusedField === "email" ? "0 0 0 3px rgba(99,102,241,0.1)" : "none",
                      color: "#e2e8f0", caretColor: "#818cf8",
                    }}
                  />
                </motion.div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold tracking-widest uppercase pl-1"
                  style={{ color: "rgba(148,163,184,0.5)" }}>
                  {ta("Password", "கடவுச்சொல்")}
                </label>
                <motion.div animate={{ scale: focusedField === "password" ? 1.01 : 1 }} transition={{ duration: 0.15 }} className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200"
                    style={{ color: focusedField === "password" ? "#818cf8" : "rgba(148,163,184,0.3)" }} />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder={ta("Enter your password", "கடவுச்சொல் உள்ளிடுங்க")}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(""); }}
                    onFocus={() => setFocusedField("password")} onBlur={() => setFocusedField(null)}
                    onKeyDown={e => e.key === "Enter" && handleSubmit()}
                    className="w-full pl-11 pr-12 rounded-2xl outline-none transition-all duration-200 text-sm font-medium"
                    style={{
                      height: "52px",
                      background: "rgba(7,11,26,0.7)",
                      border: focusedField === "password" ? "1px solid rgba(99,102,241,0.6)" : "1px solid rgba(99,102,241,0.12)",
                      boxShadow: focusedField === "password" ? "0 0 0 3px rgba(99,102,241,0.1)" : "none",
                      color: "#e2e8f0", caretColor: "#818cf8",
                    }}
                  />
                  <button type="button" onClick={() => setShowPassword(s => !s)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: "rgba(148,163,184,0.35)" }}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </motion.div>
              </div>

              {/* Forgot */}
              <div className="flex justify-end -mt-1">
                <button type="button" onClick={() => setShowForgotPassword(true)}
                  className="text-[11px] font-semibold"
                  style={{ color: "rgba(129,140,248,0.7)" }}>
                  {ta("Forgot Password?", "கடவுச்சொல் மறந்தீர்களா?")}
                </button>
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
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
                  background: canSubmit ? "linear-gradient(135deg, #4f46e5, #6366f1, #7c3aed)" : "rgba(30,27,75,0.4)",
                  boxShadow: canSubmit ? "0 8px 28px rgba(99,102,241,0.45)" : "none",
                  opacity: canSubmit ? 1 : 0.5,
                  cursor: canSubmit ? "pointer" : "not-allowed",
                }}>
                {canSubmit && (
                  <motion.div animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.5 }}
                    className="absolute inset-y-0 w-1/3 pointer-events-none"
                    style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)", transform: "skewX(-12deg)" }} />
                )}
                <span className="relative flex items-center justify-center gap-2">
                  {submitting ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{ta("Signing in...", "உள்நுழைகிறது...")}</>
                  ) : (
                    <>{ta("Sign In", "உள்நுழை")}<ArrowRight className="w-4 h-4" /></>
                  )}
                </span>
              </motion.button>
            </motion.div>

            {/* Footer */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              className="flex items-center justify-center gap-1.5 pt-1">
              <p className="text-[11px]" style={{ color: "rgba(148,163,184,0.4)" }}>
                {ta("Don't have an account?", "கணக்கு இல்லையா?")}
              </p>
              <button onClick={onSignUp} className="text-[11px] font-bold" style={{ color: "#818cf8" }}>
                {ta("Sign Up", "பதிவு செய்")}
              </button>
            </motion.div>
          </div>

          {/* Bottom shimmer */}
          <div className="h-px w-full"
            style={{ background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.2), transparent)" }} />
        </div>
      </motion.div>
    </div>
  );
}
