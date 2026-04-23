import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Lock, Bus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props {
  onVerify: (code: string) => boolean;
}

export default function AccessCodePage({ onVerify }: Props) {
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
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1, x: shake ? [0, -10, 10, -10, 10, 0] : 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <div className="glass-card rounded-2xl p-8 space-y-6 text-center">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center animate-pulse-glow">
              <Bus className="w-10 h-10 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">A.M.V Season Tickets</h1>
            <p className="text-sm text-muted-foreground">• Season Smart Management • Secure System</p>
          </motion.div>

          <div className="flex items-center gap-2 justify-center text-muted-foreground">
            <Shield className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Private Access Only</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Enter School code"
                value={code}
                onChange={(e) => { setCode(e.target.value); setError(false); }}
                className="pl-10 h-12 text-center font-mono text-lg tracking-widest bg-secondary border-border"
                autoFocus
              />
            </div>
            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-destructive">
                Invalid access code. Contact administrator.
              </motion.p>
            )}
            <Button type="submit" className="w-full h-12 gradient-primary text-primary-foreground font-semibold text-base">
              Verify Access
            </Button>
          </form>

          <p className="text-xs text-muted-foreground">
            Akkarayan Maha Vidiyalayam — A/L Students Only
          </p>
        </div>
      </motion.div>
    </div>
  );
}
