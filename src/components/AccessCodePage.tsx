import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Lock, Bus, Sparkles, ChevronRight,
  Eye, EyeOff, AlertCircle, Wifi
} from "lucide-react";
import FooterBar from "@/components/FooterBar";

interface Props {
  onVerify: (code: string) => boolean;
  lang?: "en" | "ta";
}

function Particle({ delay, x, y }: { delay: number; x: number; y: number }) {
  return (
    <motion.div
      className="absolute w-1 h-1 rounded-full bg-blue-400/30"
      style={{ left: `${x}%`, top: `${y}%` }}
      animate={{ y: [-20, -60, -20], opacity: [0, 0.6, 0], scale: [0.5, 1.2, 0.5] }}
      transition={{ duration: 4 + Math.random() * 2, repeat: Infinity, delay, ease: "easeInOut" }}
    />
  );
}

const particles = Array.from({ length: 18 }, (_, i) => ({
  id: i, x: (i * 37 + 11) % 100, y: (i * 53 + 7) % 100, delay: i * 0.3,
}));

export default function AccessCodePage({ onVerify, lang = "en" }: Props) {
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [focused, setFocused] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = () => {
    if (!code.trim()) return;
    if (!onVerify(code)) {
      setError(true);
      setShake(true);
      setAttempts((a) => a + 1);
      setTimeout(() => setShake(false), 600);
    }
  };

  const ta = (en: string, ta: string) => (lang === "ta" ? ta : en);
  const timeStr = time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: "#060d1f" }}>

      {/* Background layers */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 30%, rgba(29,78,216,0.18) 0%, transparent 65%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(99,102,241,0.10) 0%, transparent 60%)",
        }} />
        <div className="absolute inset-0 opacity-[0.035]" style={{
          backgroundImage: "linear-gradient(rgba(147,197,253,1) 1px, transparent 1px), linear-gradient(90deg, rgba(147,197,253,1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />
        <div className="absolute inset-x-0 top-0 h-40" style={{ background: "linear-gradient(to bottom, #060d1f, transparent)" }} />
        <div className="absolute inset-x-0 bottom-0 h-32" style={{ background: "linear-gradient(to top, #060d1f, transparent)" }} />
        {particles.map((p) => <Particle key={p.id} x={p.x} y={p.y} delay={p.delay} />)}
      </div>

      {/* Status bar */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="relative z-10 flex items-center justify-between px-5 pt-4 pb-1">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "rgba(52,211,153,0.8)" }}>
            {ta("Secure", "பாதுகாப்பான")}
          </span>
        </div>
        <span className="text-[11px] font-mono tracking-wider" style={{ color: "rgba(147,197,253,0.4)" }}>{timeStr}</span>
        <div className="flex items-center gap-1.5" style={{ color: "rgba(147,197,253,0.35)" }}>
          <Wifi className="w-3 h-3" />
          <Shield className="w-3 h-3" />
        </div>
      </motion.div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 pb-4">

        {/* Hero icon */}
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.1 }}
          className="relative mb-7">
          <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.25, 0.07, 0.25] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute rounded-full" style={{ inset: "-24px", background: "rgba(59,130,246,0.2)" }} />
          <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.04, 0.15] }}
            transition={{ duration: 3, repeat: Infinity, delay: 0.5, ease: "easeInOut" }}
            className="absolute rounded-full" style={{ inset: "-48px", background: "rgba(59,130,246,0.1)" }} />
          <div className="relative w-24 h-24 rounded-[28px] flex items-center justify-center" style={{
            background: "linear-gradient(135deg, #1d4ed8 0%, #3b82f6 50%, #60a5fa 100%)",
            boxShadow: "0 0 40px rgba(59,130,246,0.4), 0 8px 32px rgba(0,0,0,0.5)",
          }}>
            <Bus className="w-11 h-11 text-white drop-shadow-lg" />
            <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: "#0d1b3e", border: "2px solid rgba(59,130,246,0.4)" }}>
              <Sparkles className="w-3.5 h-3.5" style={{ color: "#60a5fa" }} />
            </div>
          </div>
        </motion.div>

        {/* Title block */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="text-center mb-7">
          <h1 className="text-[26px] font-black tracking-tight mb-1" style={{
            background: "linear-gradient(135deg, #ffffff 0%, #93c5fd 60%, #60a5fa 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.02em",
          }}>
            A.M.V Season Tickets
          </h1>
          <p className="text-[12px] font-medium tracking-wide" style={{ color: "rgba(147,197,253,0.55)" }}>
            {ta("Season Smart Management • Secure System", "பருவகால மேலாண்மை • பாதுகாப்பான அமைப்பு")}
          </p>
          <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}
            className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full" style={{
              background: "rgba(30,58,138,0.25)", border: "1px solid rgba(59,130,246,0.22)",
            }}>
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "rgba(147,197,253,0.75)" }}>
              {ta("Private Access Only", "தனியார் அணுகல் மட்டும்")}
            </span>
          </motion.div>
        </motion.div>

        {/* Card */}
        <motion.div animate={{ x: shake ? [0, -10, 10, -8, 8, -4, 4, 0] : 0 }} transition={{ duration: 0.5 }}
          className="w-full max-w-[360px]">
          <div className="rounded-3xl overflow-hidden" style={{
            background: "rgba(13,22,48,0.78)",
            border: "1px solid rgba(59,130,246,0.14)",
            backdropFilter: "blur(24px)",
            boxShadow: "0 32px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 1px 0 rgba(255,255,255,0.06) inset",
          }}>
            {/* Top accent stripe */}
            <div className="h-px w-full" style={{
              background: "linear-gradient(90deg, transparent, rgba(59,130,246,0.6), rgba(99,102,241,0.5), transparent)",
            }} />

            <div className="p-6 space-y-4">
              {/* Label */}
              <label className="block text-[10px] font-bold tracking-widest uppercase pl-1" style={{ color: "rgba(147,197,253,0.45)" }}>
                {ta("School Access Code", "பாடசாலை குறியீடு")}
              </label>

              {/* Input */}
              <motion.div animate={{ scale: focused ? 1.015 : 1 }} transition={{ duration: 0.15 }} className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 z-10 transition-colors duration-200"
                  style={{ color: focused ? "#60a5fa" : "rgba(147,197,253,0.25)" }} />
                <input
                  type={showCode ? "text" : "password"}
                  placeholder={ta("Enter school code", "பாடசாலை குறியீட்டை உள்ளிடுங்க")}
                  value={code}
                  onChange={(e) => { setCode(e.target.value); setError(false); }}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  autoFocus
                  className="w-full h-14 pl-11 pr-11 rounded-2xl text-center font-mono text-lg text-white outline-none transition-all duration-200"
                  style={{
                    background: "rgba(7,13,30,0.65)",
                    border: error ? "1px solid rgba(239,68,68,0.5)" : focused ? "1px solid rgba(59,130,246,0.45)" : "1px solid rgba(59,130,246,0.12)",
                    letterSpacing: code ? "0.25em" : "normal",
                    boxShadow: focused ? "0 0 0 3px rgba(59,130,246,0.1)" : "none",
                  }}
                />
                <button type="button" onClick={() => setShowCode((s) => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 transition-colors"
                  style={{ color: "rgba(147,197,253,0.3)" }}>
                  {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </motion.div>

              {/* Error message */}
              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, height: 0, y: -8 }} animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl overflow-hidden"
                    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#f87171" }} />
                    <p className="text-[11px] font-medium" style={{ color: "rgba(248,113,113,0.9)" }}>
                      {ta(
                        `Invalid code${attempts > 1 ? ` (${attempts} attempts)` : ""}. Contact admin.`,
                        `தவறான குறியீடு${attempts > 1 ? ` (${attempts} முறை)` : ""}. நிர்வாகியை தொடர்பு கொள்ளுங்க.`
                      )}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Verify button */}
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleSubmit} disabled={!code.trim()}
                className="relative w-full h-14 rounded-2xl font-bold text-sm text-white overflow-hidden"
                style={{
                  background: code.trim() ? "linear-gradient(135deg, #1d4ed8, #3b82f6)" : "rgba(30,58,138,0.3)",
                  boxShadow: code.trim() ? "0 8px 24px rgba(59,130,246,0.35), 0 2px 8px rgba(0,0,0,0.3)" : "none",
                  opacity: code.trim() ? 1 : 0.45,
                  cursor: code.trim() ? "pointer" : "not-allowed",
                }}>
                {code.trim() && (
                  <motion.div animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.2 }}
                    className="absolute inset-y-0 w-1/3 pointer-events-none"
                    style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)", transform: "skewX(-12deg)" }} />
                )}
                <span className="relative flex items-center justify-center gap-2">
                  {ta("Verify Access", "அணுகலை சரிபார்")}
                  {code.trim() && <ChevronRight className="w-4 h-4" />}
                </span>
              </motion.button>
            </div>

            {/* Card footer strip */}
            <div className="px-6 py-3.5 flex items-center justify-center gap-2" style={{
              borderTop: "1px solid rgba(59,130,246,0.08)", background: "rgba(7,13,30,0.4)",
            }}>
              <div className="w-1 h-1 rounded-full" style={{ background: "rgba(147,197,253,0.35)" }} />
              <p className="text-[10px] text-center font-medium tracking-wide" style={{ color: "rgba(147,197,253,0.3)" }}>
                {ta("Akkarayan Maha Vidiyalayam — A/L Students Only", "அக்கராயன் மகா வித்தியாலயம் — உயர்தர மாணவர்கள் மட்டும்")}
              </p>
              <div className="w-1 h-1 rounded-full" style={{ background: "rgba(147,197,253,0.35)" }} />
            </div>
          </div>
        </motion.div>

        {/* Encryption hint */}
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
          className="mt-5 text-[10px] text-center" style={{ color: "rgba(147,197,253,0.2)" }}>
          {ta("Protected by end-to-end encryption", "இறுதி-முனை குறியாக்கத்தால் பாதுகாக்கப்பட்டது")}
        </motion.p>
      </div>

      {/* Footer bar */}
      <div className="relative z-10">
        <FooterBar lang={lang} />
      </div>
    </div>
  );
}
