import { useState, useEffect } from "react";
import { Clock, CalendarDays } from "lucide-react";

// Sri Lanka Standard Time = UTC+5:30 (Asia/Colombo)
// Kilinochchi is in Northern Province, Sri Lanka — same timezone
const SL_TIMEZONE = "Asia/Colombo";

export default function LiveClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const time = now.toLocaleTimeString("en-US", {
    timeZone: SL_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const date = now.toLocaleDateString("en-US", {
    timeZone: SL_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="flex items-center gap-1.5">
        <Clock className="w-3 h-3 text-white/70" />
        <span className="font-mono font-bold text-white tracking-wider text-sm">{time}</span>
      </div>
      <div className="w-px h-3.5 bg-white/30" />
      <div className="flex items-center gap-1.5">
        <CalendarDays className="w-3 h-3 text-white/70" />
        <span className="text-white/80 text-xs font-medium">{date}</span>
      </div>
    </div>
  );
}
