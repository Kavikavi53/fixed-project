import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface Props {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant?: "default" | "success" | "warning" | "destructive";
  delay?: number;
}

const variantClasses: Record<string, string> = {
  default: "text-primary",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
};

export default function StatsCard({ title, value, icon: Icon, variant = "default", delay = 0 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="glass-card rounded-xl p-5"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
        </div>
        <div className={`p-2 rounded-lg bg-secondary ${variantClasses[variant]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </motion.div>
  );
}
