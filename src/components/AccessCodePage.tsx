import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Lock, Bus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props {
  onVerify: (code: string) => boolean;
  lang?: "en" | "ta";
}

export default function AccessCodePage({ onVerify, lang = "en" }: Props) {
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onVerify(code)) {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1, x: shake ? [0, -10, 10, -10, 10, 0] : 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-sm"
      >
        <div className="glass-card rounded-3xl p-7 space-y-6 text-center">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center animate-pulse-glow shadow-lg">
              <Bus className="w-10 h-10 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">A.M.V Season Tickets</h1>
              <p className="text-xs text-muted-foreground mt-1">
                {lang === "en" ? "Season Smart Management • Secure System" : "பருவகால மேலாண்மை • பாதுகாப்பான அமைப்பு"}
              </p>
            </div>
          </motion.div>

          <div className="flex items-center gap-2 justify-center text-muted-foreground">
            <Shield className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">
              {lang === "en" ? "Private Access Only" : "தனியார் அணுகல் மட்டும்"}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder={lang === "en" ? "Enter school code" : "பாடசாலை குறியீட்டை உள்ளிடுங்க"}
                value={code}
                onChange={e => { setCode(e.target.value); setError(false); }}
                className="pl-10 h-12 text-center font-mono text-lg tracking-widest bg-secondary border-border rounded-xl"
                autoFocus
              />
            </div>
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-xs text-destructive bg-destructive/10 rounded-xl px-3 py-2"
                >
                  {lang === "en" ? "Invalid access code. Contact administrator." : "தவறான குறியீடு. நிர்வாகியை தொடர்பு கொள்ளுங்க."}
                </motion.p>
              )}
            </AnimatePresence>
            <Button type="submit" className="w-full h-12 gradient-primary text-primary-foreground font-semibold text-sm rounded-xl">
              {lang === "en" ? "Verify Access" : "அணுகலை சரிபார்"}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground/70">
            {lang === "en" ? "Akkarayan Maha Vidiyalayam — A/L Students Only" : "அக்கராயன் மகா வித்தியாலயம் — உயர்தர மாணவர்கள் மட்டும்"}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
