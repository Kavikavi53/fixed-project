import { useState, useEffect, useCallback, useRef } from "react";

export type NotifType = "payment" | "student" | "announcement" | "system" | "alert";

export interface Notification {
  id: string;
  type: NotifType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  urgent?: boolean;
  studentId?: string;
  studentName?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const SOUNDS = {
  payment: () => playTone([880, 1100], 120),
  announcement: () => playTone([660, 880, 1100], 100),
  alert: () => playTone([440, 330, 440], 150),
  student: () => playTone([550, 660], 100),
  system: () => playTone([440], 80),
};

function playTone(freqs: number[], duration: number) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + duration / 1000);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + duration / 1000 + 0.05);
    });
  } catch {}
}

export function useNotifications(soundEnabled = true) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const audioEnabledRef = useRef(soundEnabled);

  useEffect(() => {
    audioEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "granted") {
      setPermissionGranted(true);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if ("Notification" in window) {
      const perm = await Notification.requestPermission();
      setPermissionGranted(perm === "granted");
    }
  }, []);

  const addNotification = useCallback((notif: Omit<Notification, "id" | "timestamp" | "read">) => {
    const id = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const full: Notification = { ...notif, id, timestamp: new Date(), read: false };

    setNotifications(prev => [full, ...prev].slice(0, 50));

    // Play sound
    if (audioEnabledRef.current) {
      SOUNDS[notif.type]?.();
    }

    // Browser push notification
    if (permissionGranted && document.hidden) {
      try {
        new (window as any).Notification(notif.title, {
          body: notif.message,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          tag: id,
        });
      } catch {}
    }
  }, [permissionGranted]);

  const markRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    panelOpen,
    setPanelOpen,
    addNotification,
    markRead,
    markAllRead,
    clearAll,
    requestPermission,
    permissionGranted,
  };
}
