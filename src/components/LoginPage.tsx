import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bus, User, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ForgotPasswordPage from "./ForgotPasswordPage";

interface Props {
  onLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onSignUp: () => void;
}

export default function LoginPage({ onLogin, onSignUp }: Props) {
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
      setAdminMode((prev) => !prev);
    } else {
      tapTimerRef.current = setTimeout(() => { tapCountRef.current = 0; }, 1500);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const result = await onLogin(email, password);
    if (!result.success) setError(result.error || "Login failed");
    setSubmitting(false);
  };

  if (showForgotPassword) {
    return <ForgotPasswordPage onBack={() => setShowForgotPassword(false)} />;
  }

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="glass-card rounded-2xl p-8 space-y-6">
          <div className="text-center space-y-3">
            <motion.div
              className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto cursor-pointer select-none ${adminMode ? "bg-destructive" : "gradient-primary"}`}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogoTap}
            >
              {adminMode ? <ShieldCheck className="w-10 h-10 text-destructive-foreground" /> : <Bus className="w-10 h-10 text-primary-foreground" />}
            </motion.div>
            <h1 className="text-2xl font-bold text-foreground">{adminMode ? "Admin Sign In" : "Sign In"}</h1>
            <p className="text-sm text-muted-foreground">{adminMode ? "Authorized Personnel Only" : "A.M.V Season Tickets System"}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                className="pl-10 h-12 bg-secondary"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                className="pl-10 pr-10 h-12 bg-secondary"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={() => setShowForgotPassword(true)} className="text-xs text-primary hover:underline">
                Forgot Password?
              </button>
            </div>
            <AnimatePresence>
              {error && (
                <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-sm text-destructive">
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
            <Button type="submit" disabled={submitting} className="w-full h-12 gradient-primary text-primary-foreground font-semibold">
              {submitting ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <button onClick={onSignUp} className="text-primary font-semibold hover:underline">
                Sign Up
              </button>
            </p>
            <p className="text-xs text-muted-foreground">A/L Students Only</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}