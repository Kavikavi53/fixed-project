import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bus, Mail, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  onBack: () => void;
}

export default function ForgotPasswordPage({ onBack }: Props) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError("Email is required"); return; }
    setSubmitting(true);
    setError("");

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (resetError) {
      setError(resetError.message);
    } else {
      setSent(true);
    }
    setSubmitting(false);
  };

  if (sent) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
          <div className="glass-card rounded-2xl p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Check Your Email</h2>
            <p className="text-sm text-muted-foreground">We sent a password reset link to <strong>{email}</strong>. Check your inbox and follow the link.</p>
            <Button onClick={onBack} variant="outline" className="w-full">Back to Sign In</Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="glass-card rounded-2xl p-8 space-y-6">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">Forgot Password</h1>
              <p className="text-xs text-muted-foreground">Enter your email to reset your password</p>
            </div>
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Bus className="w-5 h-5 text-primary-foreground" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                className="pl-10 h-12 bg-secondary"
              />
            </div>
            <AnimatePresence>
              {error && (
                <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-sm text-destructive">
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
            <Button type="submit" disabled={submitting} className="w-full h-12 gradient-primary text-primary-foreground font-semibold">
              {submitting ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
