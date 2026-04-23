import { useState, useEffect } from "react";
import { Clock, CalendarDays } from "lucide-react";

export default function LiveClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const date = now.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });

  return (
    <div className="glass-card rounded-xl px-4 py-2.5 flex items-center gap-3 text-sm">
      <div className="flex items-center gap-2">
        <Clock className="w-3.5 h-3.5 text-primary" />
        <span className="font-mono font-semibold text-foreground tracking-wide">{time}</span>
      </div>
      <div className="w-px h-4 bg-border" />
      <div className="flex items-center gap-2">
        <CalendarDays className="w-3.5 h-3.5 text-primary" />
        <span className="text-muted-foreground text-xs">{date}</span>
      </div>
    </div>
  );
}
