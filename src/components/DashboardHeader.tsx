import { Bus, LogOut, Wifi, WifiOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "./ThemeToggle";
import type { AppUser } from "@/lib/auth";
import type { RealtimeStatus } from "@/lib/store";

interface Props {
  user: AppUser;
  onLogout: () => void;
  realtimeStatus?: RealtimeStatus;
  lang: "en" | "ta";
  onLangChange: (l: "en" | "ta") => void;
}

export default function DashboardHeader({ user, onLogout, realtimeStatus = "connecting", lang, onLangChange }: Props) {
  const statusConfig = {
    live: { icon: Wifi, color: "text-success", label: lang === "en" ? "Live" : "நேரடி", pulse: true },
    connecting: { icon: Loader2, color: "text-warning", label: lang === "en" ? "Sync..." : "இணைக்கிறது...", pulse: false },
    offline: { icon: WifiOff, color: "text-destructive", label: lang === "en" ? "Offline" : "இணைப்பில்லை", pulse: false },
  }[realtimeStatus];
  const Icon = statusConfig.icon;

  return (
    <header className="sticky top-0 z-50 glass-card border-b border-border/50">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
            <Bus className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground leading-tight">A.M.V Season Tickets</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {user.role === "admin"
                ? (lang === "en" ? "Admin Panel" : "நிர்வாக பலகை")
                : (lang === "en" ? "Student Portal" : "மாணவர் போர்டல்")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status */}
          <div className={`hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full bg-secondary/60 ${statusConfig.color}`}>
            <span className="relative flex w-2 h-2">
              {statusConfig.pulse && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              )}
              <Icon className={`w-3 h-3 ${realtimeStatus === "connecting" ? "animate-spin" : ""}`} />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider">{statusConfig.label}</span>
          </div>

          {/* Email */}
          <span className="text-xs text-muted-foreground hidden md:inline">{user.email}</span>

          {/* Language Switch */}
          <div className="flex items-center bg-secondary rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => onLangChange("en")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                lang === "en"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => onLangChange("ta")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                lang === "ta"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              த
            </button>
          </div>

          <ThemeToggle />

          <Button variant="ghost" size="icon" onClick={onLogout} className="text-muted-foreground hover:text-destructive">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
