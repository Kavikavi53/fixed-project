import { Bus, LogOut, Wifi, WifiOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "./ThemeToggle";
import type { AppUser } from "@/lib/auth";
import type { RealtimeStatus } from "@/lib/store";

interface Props {
  user: AppUser;
  onLogout: () => void;
  realtimeStatus?: RealtimeStatus;
}

export default function DashboardHeader({ user, onLogout, realtimeStatus = "connecting" }: Props) {
  const statusConfig = {
    live: { icon: Wifi, color: "text-success", label: "Live", pulse: true },
    connecting: { icon: Loader2, color: "text-warning", label: "Sync...", pulse: false },
    offline: { icon: WifiOff, color: "text-destructive", label: "Offline", pulse: false },
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
              {user.role === "admin" ? "Admin Panel" : "Student Portal"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full bg-secondary/60 ${statusConfig.color}`}>
            <span className="relative flex w-2 h-2">
              {statusConfig.pulse && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              )}
              <Icon className={`w-3 h-3 ${realtimeStatus === "connecting" ? "animate-spin" : ""}`} />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider">{statusConfig.label}</span>
          </div>
          <span className="text-xs text-muted-foreground hidden md:inline">
            {user.email}
          </span>
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={onLogout} className="text-muted-foreground hover:text-destructive">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
