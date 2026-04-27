import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, CreditCard, Users, Megaphone, ShieldAlert,
  ShieldCheck, Pencil, Plus, Trash2, Clock,
} from "lucide-react";
import type { AuditEntry } from "@/lib/store";

interface Props {
  audit: AuditEntry[];
  lang?: "en" | "ta";
  maxItems?: number;
}

const ACTION_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  "Payment Update": { icon: CreditCard, color: "text-emerald-400", bg: "bg-emerald-500/15" },
  "Student Added": { icon: Plus, color: "text-blue-400", bg: "bg-blue-500/15" },
  "Student Deleted": { icon: Trash2, color: "text-red-400", bg: "bg-red-500/15" },
  "Student Updated": { icon: Pencil, color: "text-amber-400", bg: "bg-amber-500/15" },
  "Account Status": { icon: ShieldAlert, color: "text-orange-400", bg: "bg-orange-500/15" },
  "Announcement": { icon: Megaphone, color: "text-violet-400", bg: "bg-violet-500/15" },
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return new Date(dateStr).toLocaleDateString();
}

export default function ActivityFeed({ audit, lang = "en", maxItems = 8 }: Props) {
  const items = audit.slice(0, maxItems);

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40"
        style={{ background: "linear-gradient(135deg, hsl(var(--primary)/0.08), transparent)" }}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
            <Activity className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">
              {lang === "en" ? "Live Activity" : "நேரடி செயல்பாடு"}
            </p>
            <div className="flex items-center gap-1">
              <span className="relative flex w-1.5 h-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full w-1.5 h-1.5 bg-emerald-500" />
              </span>
              <span className="text-[10px] text-emerald-500 font-semibold uppercase tracking-wider">
                {lang === "en" ? "Real-time" : "நேரடி"}
              </span>
            </div>
          </div>
        </div>
        <span className="text-[10px] text-muted-foreground bg-secondary/60 px-2 py-0.5 rounded-full">
          {audit.length} {lang === "en" ? "events" : "நிகழ்வுகள்"}
        </span>
      </div>

      {/* Feed */}
      <div className="overflow-hidden">
        {items.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">
            {lang === "en" ? "No activity yet" : "இன்னும் செயல்பாடு இல்லை"}
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[31px] top-0 bottom-0 w-px bg-border/40" />

            <AnimatePresence initial={false}>
              {items.map((entry, i) => {
                const cfg = ACTION_CONFIG[entry.action] ?? {
                  icon: Activity, color: "text-muted-foreground", bg: "bg-secondary/60"
                };
                const Icon = cfg.icon;
                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="relative flex items-start gap-3 px-4 py-2.5 hover:bg-secondary/30 transition-colors"
                  >
                    {/* Icon bubble */}
                    <div className={`relative z-10 shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${cfg.bg}`}>
                      <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-[11px] font-semibold text-foreground truncate">
                        {entry.action}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate leading-relaxed">
                        {entry.details}
                      </p>
                    </div>

                    {/* Time */}
                    <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-0.5 pt-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {timeAgo(entry.created_at ?? "")}
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
