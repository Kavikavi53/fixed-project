/**
 * ChatWindow.tsx — Pro Level Real-Time Chat (FULLY FIXED)
 *
 * FIXES:
 * 1. subscribeDB: NO server-side filter (avoids REPLICA IDENTITY issue) → client-side filter
 * 2. fetchHistoryFromDB: always loads ALL messages from DB on connect (full refresh)
 * 3. Admin → Student: both broadcast + DB postgres_changes deliver reliably
 * 4. Student → Admin: both broadcast + DB postgres_changes deliver reliably
 * 5. Offline: messages saved to DB → on reconnect DB listener picks them up
 * 6. Student floating chat: unread badge + toast + messages shown on open
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, X, MessageCircle, CheckCheck, Check, Clock, Loader2,
  Edit3, HelpCircle, Phone, User2, ChevronDown,
  Wifi, WifiOff, Trash2, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type MsgType   = "text" | "edit_request" | "doubt" | "contact_request";
type Role      = "admin" | "student";
type ConnState = "connecting" | "connected" | "disconnected";
type DeliveryStatus = "sending" | "sent" | "delivered" | "read";

export interface Message {
  id: string;
  senderId: string;
  senderRole: Role;
  studentId: string;
  text: string;
  type: MsgType;
  deliveryStatus: DeliveryStatus;
  ts: number;
}

export interface Props {
  studentId: string;
  studentName: string;
  role: Role;
  userId: string;
  lang?: "en" | "ta";
  onClose?: () => void;
  floating?: boolean;
  onUnreadChange?: (studentId: string, count: number) => void;
}

const L = (lang: "en" | "ta", en: string, ta: string) => lang === "en" ? en : ta;
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const MSG_META: Record<MsgType, { en: string; ta: string; Icon: React.ElementType; badge: string }> = {
  text:            { en: "Message",       ta: "செய்தி",         Icon: MessageCircle, badge: "bg-primary/10 text-primary" },
  edit_request:    { en: "Edit Request",  ta: "Edit கோரிக்கை", Icon: Edit3,         badge: "bg-amber-500/10 text-amber-600" },
  doubt:           { en: "Doubt",         ta: "சந்தேகம்",       Icon: HelpCircle,    badge: "bg-violet-500/10 text-violet-600" },
  contact_request: { en: "Contact Admin", ta: "Admin தொடர்பு",  Icon: Phone,         badge: "bg-rose-500/10 text-rose-600" },
};

// ── LocalStorage helpers ───────────────────────────────────────────────────────
const STORAGE_KEY = (sid: string) => `amv_chat_msgs_${sid}`;
const QUEUE_KEY   = (sid: string) => `amv_chat_queue_${sid}`;
const UNREAD_KEY  = (sid: string) => `amv_chat_unread_${sid}`;

function loadMessages(sid: string): Message[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY(sid)) ?? "[]"); } catch { return []; }
}
function saveMessages(sid: string, msgs: Message[]) {
  try { localStorage.setItem(STORAGE_KEY(sid), JSON.stringify(msgs.slice(-300))); } catch {}
}
function clearMessages(sid: string) {
  try { localStorage.removeItem(STORAGE_KEY(sid)); } catch {}
}
function loadQueue(sid: string): Message[] {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY(sid)) ?? "[]"); } catch { return []; }
}
function saveQueue(sid: string, q: Message[]) {
  try { localStorage.setItem(QUEUE_KEY(sid), JSON.stringify(q)); } catch {}
}
function clearQueue(sid: string) {
  try { localStorage.removeItem(QUEUE_KEY(sid)); } catch {}
}
export function getUnreadCount(sid: string): number {
  try { return parseInt(localStorage.getItem(UNREAD_KEY(sid)) ?? "0", 10); } catch { return 0; }
}
function setUnreadCount(sid: string, n: number) {
  try { localStorage.setItem(UNREAD_KEY(sid), String(Math.max(0, n))); } catch {}
}
function clearUnreadCount(sid: string) {
  try { localStorage.removeItem(UNREAD_KEY(sid)); } catch {}
}

// ── Time helpers ───────────────────────────────────────────────────────────────
function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(ts: number) {
  const d = new Date(ts), today = new Date(), yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
}
function groupByDate(msgs: Message[]) {
  const groups: { date: string; msgs: Message[] }[] = [];
  let cur = "";
  for (const m of msgs) {
    const label = fmtDate(m.ts);
    if (label !== cur) { cur = label; groups.push({ date: label, msgs: [m] }); }
    else groups[groups.length - 1].msgs.push(m);
  }
  return groups;
}

// ── Delivery icon ──────────────────────────────────────────────────────────────
function DeliveryIcon({ status }: { status: DeliveryStatus }) {
  if (status === "sending")   return <Clock className="w-3 h-3 text-muted-foreground/40" />;
  if (status === "sent")      return <Check className="w-3 h-3 text-muted-foreground/60" />;
  if (status === "delivered") return <CheckCheck className="w-3 h-3 text-muted-foreground/60" />;
  return <CheckCheck className="w-3 h-3 text-primary" />;
}

// ── Message Bubble ─────────────────────────────────────────────────────────────
function Bubble({ msg, isMine, lang }: { msg: Message; isMine: boolean; lang: "en" | "ta" }) {
  const { Icon, badge, en, ta } = MSG_META[msg.type];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 480, damping: 34 }}
      className={`flex ${isMine ? "justify-end" : "justify-start"} mb-1.5`}
    >
      {!isMine && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mr-2 mt-auto mb-0.5 shrink-0">
          <User2 className="w-3.5 h-3.5 text-white" />
        </div>
      )}
      <div className={`max-w-[78%] flex flex-col gap-0.5 ${isMine ? "items-end" : "items-start"}`}>
        {msg.type !== "text" && (
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge} ${isMine ? "self-end" : "self-start"}`}>
            <Icon className="w-2.5 h-2.5" />{L(lang, en, ta)}
          </span>
        )}
        <div className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed shadow-sm ${
          isMine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-secondary text-secondary-foreground rounded-bl-sm"
        }`}>
          {msg.text}
        </div>
        <div className={`flex items-center gap-1 text-[10px] text-muted-foreground ${isMine ? "justify-end" : "justify-start"}`}>
          <span>{fmtTime(msg.ts)}</span>
          {isMine && <DeliveryIcon status={msg.deliveryStatus} />}
        </div>
      </div>
    </motion.div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-3.5 py-2.5 bg-secondary rounded-2xl rounded-bl-sm w-fit ml-9 mb-2">
      {[0, 1, 2].map(i => (
        <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50"
          animate={{ y: [0, -5, 0] }}
          transition={{ repeat: Infinity, duration: 0.85, delay: i * 0.16 }} />
      ))}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ChatWindow({
  studentId, studentName, role, userId, lang = "en", onClose, floating = false, onUnreadChange,
}: Props) {
  const [messages, setMessages]         = useState<Message[]>(() => loadMessages(studentId));
  const [input, setInput]               = useState("");
  const [msgType, setMsgType]           = useState<MsgType>("text");
  const [sending, setSending]           = useState(false);
  const [open, setOpen]                 = useState(!floating);
  const [unread, setUnread]             = useState(() => getUnreadCount(studentId));
  const [conn, setConn]                 = useState<ConnState>("connecting");
  const [peerTyping, setPeerTyping]     = useState(false);
  const [showDown, setShowDown]         = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<Message[]>(() => loadQueue(studentId));

  const bottomRef    = useRef<HTMLDivElement>(null);
  const scrollRef    = useRef<HTMLDivElement>(null);
  const channelRef   = useRef<any>(null);
  const dbChannelRef = useRef<any>(null);
  const typingTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOpenRef    = useRef(open);
  isOpenRef.current  = open;

  // Deduplicate: track all message IDs we've already processed
  const seenIdsRef = useRef<Set<string>>(new Set(loadMessages(studentId).map(m => m.id)));

  // The other side's role
  const otherRole: Role = role === "admin" ? "student" : "admin";

  // Both sides join the SAME broadcast channel
  const BROADCAST_CHANNEL = `amv_chat_v3_${studentId}`;

  const updateMessages = useCallback((updater: (prev: Message[]) => Message[]) => {
    setMessages(prev => {
      const next = updater(prev);
      saveMessages(studentId, next);
      return next;
    });
  }, [studentId]);

  // ── Ingest an incoming message (deduped) ────────────────────────────────────
  const ingestMessage = useCallback((msg: Message) => {
    if (seenIdsRef.current.has(msg.id)) return;
    seenIdsRef.current.add(msg.id);

    updateMessages(prev => {
      if (prev.some(m => m.id === msg.id)) return prev;
      const next = [...prev, { ...msg, deliveryStatus: "delivered" as DeliveryStatus }];
      return next.sort((a, b) => a.ts - b.ts);
    });

    // Show notification only for messages from the other side
    if (msg.senderRole !== role) {
      if (!isOpenRef.current) {
        const newCount = getUnreadCount(studentId) + 1;
        setUnread(newCount);
        setUnreadCount(studentId, newCount);
        onUnreadChange?.(studentId, newCount);
        const label = role === "admin" ? studentName : "Admin";
        toast(`💬 ${label}`, {
          description: msg.text.slice(0, 70) + (msg.text.length > 70 ? "…" : ""),
          duration: 5000,
        });
      }
    }
  }, [studentId, role, studentName, updateMessages, onUnreadChange]);

  // ── DB helpers ──────────────────────────────────────────────────────────────
  const saveMessageToDB = useCallback(async (msg: Message) => {
    try {
      await supabase.from("chat_messages").insert({
        id: msg.id,
        student_id: msg.studentId,
        sender_role: msg.senderRole,
        sender_id: msg.senderId,
        message: msg.text,
        message_type: msg.type,
        is_read: false,
      });
    } catch (err) {
      console.error("[ChatWindow] saveMessageToDB error:", err);
    }
  }, []);

  /**
   * Load ALL messages for this student from DB and merge.
   * Called on connect/reconnect to catch messages missed while offline.
   */
  const fetchHistoryFromDB = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: true });

      if (error || !data?.length) return;

      const dbMessages: Message[] = data.map(row => ({
        id: row.id,
        senderId: row.sender_id ?? "",
        senderRole: row.sender_role as Role,
        studentId: row.student_id,
        text: row.message,
        type: row.message_type as MsgType,
        deliveryStatus: (row.sender_role === role ? "sent" : "delivered") as DeliveryStatus,
        ts: new Date(row.created_at).getTime(),
      }));

      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id));
        const newMsgs = dbMessages.filter(m => !existingIds.has(m.id));
        // Add all to seenIds
        dbMessages.forEach(m => seenIdsRef.current.add(m.id));

        // Count unread for badge
        if (!isOpenRef.current) {
          const unreadCount = data.filter(r => r.sender_role === otherRole && !r.is_read).length;
          if (unreadCount > 0) {
            setUnread(unreadCount);
            setUnreadCount(studentId, unreadCount);
            onUnreadChange?.(studentId, unreadCount);
          }
        }

        if (!newMsgs.length) return prev;
        const merged = [...prev, ...newMsgs].sort((a, b) => a.ts - b.ts);
        saveMessages(studentId, merged);
        return merged;
      });
    } catch (err) {
      console.error("[ChatWindow] fetchHistoryFromDB error:", err);
    }
  }, [studentId, role, otherRole, onUnreadChange]);

  const markReadInDB = useCallback(async () => {
    try {
      await supabase
        .from("chat_messages")
        .update({ is_read: true })
        .eq("student_id", studentId)
        .eq("sender_role", otherRole)
        .eq("is_read", false);
    } catch (err) {
      console.error("[ChatWindow] markReadInDB error:", err);
    }
  }, [studentId, otherRole]);

  // ── Offline queue flush ─────────────────────────────────────────────────────
  const flushQueue = useCallback(async (ch: any) => {
    const q = loadQueue(studentId);
    if (!q.length) return;
    clearQueue(studentId);
    setOfflineQueue([]);
    for (const msg of q) {
      const sent = { ...msg, deliveryStatus: "sent" as DeliveryStatus };
      try {
        await ch.send({ type: "broadcast", event: "message", payload: sent });
        updateMessages(prev => prev.map(m => m.id === msg.id ? sent : m));
      } catch {
        setOfflineQueue(prev => { const nq = [...prev, msg]; saveQueue(studentId, nq); return nq; });
      }
    }
  }, [studentId, updateMessages]);

  // ── DB Realtime: catches messages from OTHER side ───────────────────────────
  // IMPORTANT: NO server-side filter to avoid REPLICA IDENTITY FULL requirement.
  // Filter is done CLIENT-SIDE by studentId + senderRole.
  const subscribeDB = useCallback(() => {
    if (dbChannelRef.current) { supabase.removeChannel(dbChannelRef.current); dbChannelRef.current = null; }

    const ch = supabase
      .channel(`amv_db_v3_${role}_${studentId}`)
      .on(
        "postgres_changes" as any,
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          // No server filter — client-side check below handles it
        },
        (payload: any) => {
          const row = payload.new;
          // CLIENT-SIDE FILTER: correct student + from the other role only
          if (row.student_id !== studentId) return;
          if (row.sender_role !== otherRole) return;

          const msg: Message = {
            id: row.id,
            senderId: row.sender_id ?? "",
            senderRole: row.sender_role as Role,
            studentId: row.student_id,
            text: row.message,
            type: row.message_type as MsgType,
            deliveryStatus: "delivered",
            ts: new Date(row.created_at).getTime(),
          };
          ingestMessage(msg);
        }
      )
      .subscribe();

    dbChannelRef.current = ch;
  }, [studentId, role, otherRole, ingestMessage]);

  // ── Broadcast channel: instant real-time ───────────────────────────────────
  const subscribe = useCallback(() => {
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
    if (reconnTimer.current) { clearTimeout(reconnTimer.current); reconnTimer.current = null; }
    setConn("connecting");

    const ch = supabase.channel(BROADCAST_CHANNEL, {
      config: { broadcast: { self: false, ack: false } },
    });

    // Incoming messages from the other side
    ch.on("broadcast", { event: "message" }, ({ payload }: { payload: Message }) => {
      if (payload.studentId !== studentId) return;
      if (payload.senderRole === role) return; // ignore own echoes
      ingestMessage(payload);
      // Send delivery receipt back
      ch.send({ type: "broadcast", event: "delivered", payload: { msgId: payload.id, role } });
    });

    // Typing indicator
    ch.on("broadcast", { event: "typing" }, ({ payload }: { payload: { role: Role; studentId: string } }) => {
      if (payload.studentId !== studentId) return;
      if (payload.role === role) return;
      setPeerTyping(true);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setPeerTyping(false), 2500);
    });

    // Delivery receipt from other side
    ch.on("broadcast", { event: "delivered" }, ({ payload }: { payload: { msgId: string; role: Role } }) => {
      if (payload.role === role) return;
      updateMessages(prev =>
        prev.map(m => m.id === payload.msgId && m.deliveryStatus === "sent" ? { ...m, deliveryStatus: "delivered" } : m)
      );
    });

    // Read receipt from other side
    ch.on("broadcast", { event: "read" }, ({ payload }: { payload: { role: Role; studentId: string } }) => {
      if (payload.studentId !== studentId) return;
      if (payload.role === role) return;
      updateMessages(prev => prev.map(m => m.senderRole === role ? { ...m, deliveryStatus: "read" } : m));
    });

    // Chat cleared
    ch.on("broadcast", { event: "clear" }, ({ payload }: { payload: { studentId: string } }) => {
      if (payload.studentId !== studentId) return;
      setMessages([]); clearMessages(studentId);
      seenIdsRef.current.clear();
    });

    ch.subscribe(async (status: string) => {
      if (status === "SUBSCRIBED") {
        setConn("connected");
        // 1. Flush offline queue (broadcasts queued messages)
        await flushQueue(ch);
        // 2. Load full history from DB (catches all missed messages)
        await fetchHistoryFromDB();
        // 3. Mark as read if chat is open
        if (isOpenRef.current) {
          ch.send({ type: "broadcast", event: "read", payload: { role, studentId } });
          updateMessages(prev => prev.map(m => m.senderRole !== role ? { ...m, deliveryStatus: "read" } : m));
          setUnread(0); clearUnreadCount(studentId); onUnreadChange?.(studentId, 0);
          await markReadInDB();
        }
      }
      if (status === "CLOSED" || status === "CHANNEL_ERROR") {
        setConn("disconnected");
        reconnTimer.current = setTimeout(() => subscribe(), 3500);
      }
    });

    channelRef.current = ch;
  }, [BROADCAST_CHANNEL, studentId, role, flushQueue, fetchHistoryFromDB, markReadInDB, updateMessages, ingestMessage, onUnreadChange]);

  // Mount: start both channels
  useEffect(() => {
    subscribe();
    subscribeDB();
    return () => {
      if (channelRef.current)   supabase.removeChannel(channelRef.current);
      if (dbChannelRef.current) supabase.removeChannel(dbChannelRef.current);
      if (reconnTimer.current)  clearTimeout(reconnTimer.current);
      if (typingTimer.current)  clearTimeout(typingTimer.current);
    };
  }, [subscribe, subscribeDB]);

  // When admin switches student → reload state for new student
  useEffect(() => {
    const saved = loadMessages(studentId);
    setMessages(saved);
    setOfflineQueue(loadQueue(studentId));
    seenIdsRef.current = new Set(saved.map(m => m.id));
    setUnread(getUnreadCount(studentId));
    setPeerTyping(false);
  }, [studentId]);

  // Auto-scroll
  useEffect(() => {
    if (open) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
  }, [messages, open, peerTyping]);

  // Mark read when chat opens
  useEffect(() => {
    if (!open) return;
    setUnread(0); clearUnreadCount(studentId); onUnreadChange?.(studentId, 0);
    updateMessages(prev => prev.map(m => m.senderRole !== role ? { ...m, deliveryStatus: "read" } : m));
    if (channelRef.current && conn === "connected") {
      channelRef.current.send({ type: "broadcast", event: "read", payload: { role, studentId } });
    }
    markReadInDB();
  }, [open, conn, role, studentId, updateMessages, onUnreadChange, markReadInDB]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setShowDown(scrollHeight - scrollTop - clientHeight > 80);
  };

  const broadcastTyping = useCallback(() => {
    if (!channelRef.current || conn !== "connected") return;
    channelRef.current.send({ type: "broadcast", event: "typing", payload: { role, studentId } });
  }, [conn, role, studentId]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value); broadcastTyping();
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);

    const msg: Message = {
      id: uid(), senderId: userId, senderRole: role,
      studentId,
      text, type: msgType,
      deliveryStatus: conn === "connected" ? "sent" : "sending",
      ts: Date.now(),
    };

    // Mark seen immediately (prevents re-ingesting via DB realtime)
    seenIdsRef.current.add(msg.id);
    updateMessages(prev => [...prev, msg]);
    setInput(""); setMsgType("text");

    // Always persist to DB — triggers postgres_changes on the other side
    await saveMessageToDB(msg);

    if (conn === "connected" && channelRef.current) {
      try {
        await channelRef.current.send({ type: "broadcast", event: "message", payload: msg });
      } catch {
        toast.error(L(lang, "Send failed. Message queued.", "அனுப்பல் தோல்வி. Queue-ல் சேர்க்கப்பட்டது."));
        setOfflineQueue(prev => { const nq = [...prev, msg]; saveQueue(studentId, nq); return nq; });
      }
    } else {
      setOfflineQueue(prev => { const nq = [...prev, msg]; saveQueue(studentId, nq); return nq; });
      toast.info(L(lang, "Offline: Message saved & will send when reconnected.", "Offline: Message சேமிக்கப்பட்டது, இணைந்தவுடன் அனுப்பப்படும்."), { duration: 3000 });
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleClear = () => {
    if (!channelRef.current) return;
    setMessages([]); clearMessages(studentId);
    seenIdsRef.current.clear();
    channelRef.current.send({ type: "broadcast", event: "clear", payload: { studentId } });
    toast.success(L(lang, "Chat cleared", "Chat அழிக்கப்பட்டது"));
  };

  const bodyProps = {
    messages, role, userId, studentName, lang,
    input, handleInput, msgType, setMsgType,
    sending, handleSend, handleKeyDown,
    bottomRef, scrollRef, handleScroll, showDown,
    conn, peerTyping, handleClear, onClose, offlineQueue,
  };

  // ── Floating (Student portal) ───────────────────────────────────────────────
  if (floating) {
    const lastAdminMsg = [...messages].reverse().find(m => m.senderRole === otherRole);

    return (
      <div className="fixed bottom-6 right-4 z-50 flex flex-col items-end gap-3">
        <AnimatePresence>
          {open && (
            <motion.div key="chat-panel"
              initial={{ opacity: 0, y: 28, scale: 0.88 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 28, scale: 0.88 }}
              transition={{ type: "spring", stiffness: 360, damping: 28 }}
              className="w-[330px] sm:w-[380px] h-[500px] rounded-3xl shadow-2xl border border-border/60 flex flex-col overflow-hidden glass-card"
              style={{ backdropFilter: "blur(24px)" }}
            >
              <ChatBody {...bodyProps} onClose={() => setOpen(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Latest admin message preview (only when chat is closed) */}
        {!open && lastAdminMsg && (
          <motion.button
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => setOpen(true)}
            className="max-w-[240px] bg-card border border-border/60 rounded-2xl shadow-lg px-3 py-2 text-left hover:bg-secondary/80 transition-colors"
          >
            <p className="text-[10px] font-bold text-primary mb-0.5">Admin</p>
            <p className="text-xs text-foreground truncate">{lastAdminMsg.text}</p>
          </motion.button>
        )}

        {/* Chat toggle button */}
        <motion.button
          whileTap={{ scale: 0.84 }} whileHover={{ scale: 1.08 }}
          onClick={() => {
            const next = !open;
            setOpen(next);
            if (next) { setUnread(0); clearUnreadCount(studentId); onUnreadChange?.(studentId, 0); }
          }}
          className="w-14 h-14 rounded-full gradient-primary shadow-2xl flex items-center justify-center relative"
        >
          <AnimatePresence mode="wait">
            {open
              ? <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}><X className="w-5 h-5 text-white" /></motion.div>
              : <motion.div key="c" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}><MessageCircle className="w-6 h-6 text-white" /></motion.div>
            }
          </AnimatePresence>
          <AnimatePresence>
            {unread > 0 && !open && (
              <motion.span key="badge" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow">
                {unread > 9 ? "9+" : unread}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    );
  }

  // ── Embedded (Admin panel) ──────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-[420px] rounded-2xl border border-border/50 overflow-hidden glass-card">
      <ChatBody {...bodyProps} />
    </div>
  );
}

// ── ChatBody ───────────────────────────────────────────────────────────────────
interface BodyProps {
  messages: Message[]; role: Role; userId: string; studentName: string; lang: "en" | "ta";
  input: string; handleInput: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  msgType: MsgType; setMsgType: (v: MsgType) => void; sending: boolean;
  handleSend: () => void; handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  bottomRef: React.RefObject<HTMLDivElement>; scrollRef: React.RefObject<HTMLDivElement>;
  handleScroll: () => void; showDown: boolean; conn: ConnState; peerTyping: boolean;
  handleClear: () => void; onClose?: () => void; offlineQueue: Message[];
}

function ChatBody({
  messages, role, userId, studentName, lang,
  input, handleInput, msgType, setMsgType, sending,
  handleSend, handleKeyDown, bottomRef, scrollRef,
  handleScroll, showDown, conn, peerTyping, handleClear, onClose, offlineQueue,
}: BodyProps) {
  const grouped = groupByDate(messages);
  const QUICK: MsgType[] = role === "student" ? ["text", "edit_request", "doubt", "contact_request"] : ["text"];
  const connColor = conn === "connected" ? "bg-emerald-400" : conn === "connecting" ? "bg-amber-400 animate-pulse" : "bg-rose-500";
  const connText  = conn === "connected"
    ? L(lang, "Live • Real-time", "Live • Real-time")
    : conn === "connecting" ? L(lang, "Connecting…", "இணைக்கிறது…")
    : L(lang, "Offline — retrying…", "Offline — மீண்டும் முயற்சிக்கிறது…");

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-card/70 shrink-0">
        <div className="relative shrink-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
            <User2 className="w-4 h-4 text-white" />
          </div>
          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${connColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{role === "student" ? "Admin" : studentName}</p>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            {conn === "connected" ? <Wifi className="w-3 h-3 text-emerald-500" />
              : conn === "connecting" ? <Loader2 className="w-3 h-3 animate-spin" />
              : <WifiOff className="w-3 h-3 text-rose-500" />}
            {connText}
          </p>
        </div>
        {offlineQueue.length > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
            <AlertCircle className="w-3 h-3" />{offlineQueue.length} queued
          </span>
        )}
        {role === "admin" && messages.length > 0 && (
          <button onClick={handleClear} title="Clear chat"
            className="text-muted-foreground hover:text-rose-500 transition-colors p-1 rounded-lg hover:bg-rose-500/10">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
        {onClose && (
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary transition-colors ml-1">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-4 scroll-smooth"
        style={{ scrollbarWidth: "thin" }}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground select-none">
            <div className="w-16 h-16 rounded-full bg-secondary/70 flex items-center justify-center">
              <MessageCircle className="w-8 h-8 opacity-25" />
            </div>
            <p className="text-sm text-center leading-relaxed">
              {L(lang, "No messages yet.\nStart the conversation!", "இன்னும் செய்தி இல்லை.\nபேசுங்கள்!")}
            </p>
            {conn === "connecting" && (
              <span className="flex items-center gap-1.5 text-xs text-amber-500">
                <Loader2 className="w-3 h-3 animate-spin" />
                {L(lang, "Connecting to server…", "Server-உடன் இணைக்கிறது…")}
              </span>
            )}
          </div>
        ) : (
          <>
            {grouped.map(group => (
              <div key={group.date}>
                <div className="flex items-center gap-2 my-4">
                  <div className="h-px flex-1 bg-border/40" />
                  <span className="text-[10px] font-medium text-muted-foreground px-2.5 py-0.5 rounded-full bg-secondary">{group.date}</span>
                  <div className="h-px flex-1 bg-border/40" />
                </div>
                {group.msgs.map(msg => (
                  <Bubble key={msg.id} msg={msg} lang={lang} isMine={msg.senderRole === role} />
                ))}
              </div>
            ))}
            {peerTyping && <TypingDots />}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Scroll down button */}
      <AnimatePresence>
        {showDown && (
          <motion.button
            initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}
            onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="absolute bottom-[136px] right-3 w-8 h-8 rounded-full bg-primary text-white shadow-lg flex items-center justify-center z-10">
            <ChevronDown className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Quick type (student only) */}
      {role === "student" && (
        <div className="flex gap-1.5 px-3 pt-2 pb-1.5 flex-wrap shrink-0 border-t border-border/30 bg-card/30">
          {QUICK.map(type => {
            const { Icon, en, ta } = MSG_META[type];
            const active = msgType === type;
            return (
              <button key={type} onClick={() => setMsgType(type)}
                className={`flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all duration-150 ${
                  active ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border text-muted-foreground hover:border-primary/70 hover:text-primary"
                }`}>
                <Icon className="w-2.5 h-2.5" />{L(lang, en, ta)}
              </button>
            );
          })}
        </div>
      )}

      {/* Input */}
      <div className="flex items-end gap-2 px-3 pb-3 pt-2 border-t border-border/40 shrink-0 bg-card/50">
        <Textarea
          value={input} onChange={handleInput} onKeyDown={handleKeyDown}
          placeholder={
            conn === "disconnected"
              ? L(lang, "Offline — messages will queue", "Offline — messages queue ஆகும்")
              : L(lang,
                  role === "admin" ? "Reply to student…" : "Type your message…",
                  role === "admin" ? "Student-க்கு reply…" : "உங்கள் message இங்கே…")
          }
          className="resize-none text-sm rounded-xl min-h-[42px] max-h-[110px] bg-secondary border-0 focus-visible:ring-1 focus-visible:ring-primary"
          rows={1}
        />
        <Button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          size="icon"
          className={`text-primary-foreground rounded-xl h-10 w-10 shrink-0 shadow-md transition-all ${
            conn !== "connected" ? "bg-amber-500 hover:bg-amber-600" : "gradient-primary"
          }`}
          title={conn !== "connected" ? "Offline – will queue" : "Send"}>
          {sending ? <Loader2 className="w-4 h-4 animate-spin" />
            : conn !== "connected" ? <Clock className="w-4 h-4" />
            : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
