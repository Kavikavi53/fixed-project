import { useState, useEffect } from "react";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ✅ offlineStore import தேவையில்லை — இங்கேயே define பண்றோம்
function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

interface Props {
  pendingCount?: number;
  isSyncing?: boolean;
  onSyncNow?: () => void;
}

export default function OfflineBanner({ pendingCount = 0, isSyncing = false, onSyncNow }: Props) {
  const online = useOnlineStatus();

  return (
    <AnimatePresence>
      {(!online || pendingCount > 0) && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2 text-xs font-semibold shadow-lg ${
            online ? "bg-amber-500 text-white" : "bg-destructive text-destructive-foreground"
          }`}
        >
          <div className="flex items-center gap-2">
            {online ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {online
              ? `${pendingCount} changes pending sync...`
              : "நீங்கள் offline ஆக உள்ளீர்கள் — data locally saved"}
          </div>
          {online && pendingCount > 0 && onSyncNow && (
            <button
              onClick={onSyncNow}
              disabled={isSyncing}
              className="flex items-center gap-1 bg-white/20 hover:bg-white/30 rounded px-2 py-0.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing..." : "Sync Now"}
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}