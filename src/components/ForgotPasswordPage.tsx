import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bus, Mail, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  onBack: () => void;
  lang?: "en" | "ta";
}

export default function ForgotPasswordPage({ onBack, lang = "en" }: Props) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError(lang === "en" ? "Email is required" : "மின்னஞ்சல் தேவை");
      return;
    }
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
        <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm">
          <div className="glass-card rounded-3xl p-7 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mx-auto ring-4 ring-primary/10">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {lang === "en" ? "Check Your Email" : "உங்கள் மின்னஞ்சலை சரிபார்க்கவும்"}
              </h2>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                {lang === "en"
                  ? `We sent a reset link to ${email}. Check your inbox.`
                  : `${email} க்கு reset link அனுப்பப்பட்டது. Inbox சரிபாருங்க.`}
              </p>
            </div>
            <Button onClick={onBack} variant="outline" className="w-full h-11 rounded-xl text-sm">
              {lang === "en" ? "Back to Sign In" : "உள்நுழைவுக்கு திரும்பு"}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="glass-card rounded-3xl p-7 space-y-6">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-base font-bold text-foreground">
                {lang === "en" ? "Forgot Password" : "கடவுச்சொல் மறந்தது"}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lang === "en" ? "Enter your email to reset" : "Reset-க்கு மின்னஞ்சல் உள்ளிடுங்க"}
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
              <Bus className="w-4 h-4 text-primary-foreground" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder={lang === "en" ? "Email address" : "மின்னஞ்சல் முகவரி"}
                value={email}
                onChange={e => { setEmail(e.target.value); setError(""); }}
                className="pl-10 h-12 bg-secondary rounded-xl text-sm"
              />
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
                ? (lang === "en" ? "Sending..." : "அனுப்புகிறது...")
                : (lang === "en" ? "Send Reset Link" : "Reset Link அனுப்பு")}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
