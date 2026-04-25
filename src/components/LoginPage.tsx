import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bus, User, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  const [adminMode, setAdminMode] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogoTap = () => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      setAdminMode(prev => !prev);
    } else {
      tapTimerRef.current = setTimeout(() => { tapCountRef.current = 0; }, 1500);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const result = await onLogin(email, password);
    if (!result.success) setError(result.error || (lang === "en" ? "Login failed" : "Login தோல்வியடைந்தது"));
    setSubmitting(false);
  };

  if (showForgotPassword) return <ForgotPasswordPage onBack={() => setShowForgotPassword(false)} lang={lang} />;

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
        className="w-full max-w-sm"
      >
        <div className="glass-card rounded-3xl p-7 space-y-6">
          <div className="text-center space-y-3">
            <motion.div
              className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto cursor-pointer select-none shadow-lg ${adminMode ? "bg-destructive" : "gradient-primary"}`}
              whileTap={{ scale: 0.93 }}
              onClick={handleLogoTap}
            >
              {adminMode
                ? <ShieldCheck className="w-10 h-10 text-destructive-foreground" />
                : <Bus className="w-10 h-10 text-primary-foreground" />}
            </motion.div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {adminMode
                  ? (lang === "en" ? "Admin Sign In" : "Admin உள்நுழைவு")
                  : (lang === "en" ? "Welcome Back" : "மீண்டும் வரவேற்கிறோம்")}
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                {adminMode
                  ? (lang === "en" ? "Authorized Personnel Only" : "அங்கீகரிக்கப்பட்டவர்கள் மட்டும்")
                  : "A.M.V Season Tickets"}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder={lang === "en" ? "Email address" : "மின்னஞ்சல் முகவரி"}
                value={email}
                onChange={e => { setEmail(e.target.value); setError(""); }}
                className="pl-10 h-12 bg-secondary rounded-xl text-sm"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder={lang === "en" ? "Password" : "கடவுச்சொல்"}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }}
                className="pl-10 pr-11 h-12 bg-secondary rounded-xl text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex justify-end">
              <button type="button" onClick={() => setShowForgotPassword(true)} className="text-xs text-primary hover:underline">
                {lang === "en" ? "Forgot Password?" : "கடவுச்சொல் மறந்தீர்களா?"}
              </button>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <p className="text-xs text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <Button type="submit" disabled={submitting} className="w-full h-12 gradient-primary text-primary-foreground font-semibold rounded-xl text-sm">
              {submitting
                ? (lang === "en" ? "Signing in..." : "உள்நுழைகிறது...")
                : (lang === "en" ? "Sign In" : "உள்நுழை")}
            </Button>
          </form>

          <div className="text-center space-y-1.5">
            <p className="text-sm text-muted-foreground">
              {lang === "en" ? "Don't have an account? " : "கணக்கு இல்லையா? "}
              <button onClick={onSignUp} className="text-primary font-semibold hover:underline">
                {lang === "en" ? "Sign Up" : "பதிவு செய்"}
              </button>
            </p>
            <p className="text-[11px] text-muted-foreground/60">
              {lang === "en" ? "A/L Students Only" : "உயர்தர மாணவர்கள் மட்டும்"}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
