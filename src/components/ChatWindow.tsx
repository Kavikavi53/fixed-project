/**
 * ChatWindow.tsx — Pro-Level Real-Time Chat
 * Uses Supabase Realtime BROADCAST (no database table required)
 * Messages persist in localStorage per student channel
 *
 * Admin: <ChatWindow studentId={id} studentName={name} role="admin" userId={uid} lang={lang} />
 * Student: <ChatWindow studentId={id} studentName={name} role="student" userId={uid} lang={lang} floating />
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, X, MessageCircle, CheckCheck, Clock, Loader2,
  Edit3, HelpCircle, Phone, User2, ChevronDown,
  Wifi, WifiOff, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────
type MsgType   = "text" | "edit_request" | "doubt" | "contact_request";
type Role      = "admin" | "student";
type ConnState = "connecting" | "connected" | "disconnected";

interface Message {
  id: string;
  senderId: string;
  senderRole: Role;
  text: string;
  type: MsgType;
  isRead: boolean;
  ts: number; // epoch ms
}

interface Props {
  studentId: string;
  studentName: string;
  role: Role;
  userId: string;
  lang?: "en" | "ta";
  onClose?: () => void;
  floating?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const L = (lang: "en" | "ta", en: string, ta: string) => lang === "en" ? en : ta;

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const MSG_META: Record<MsgType, { en: string; ta: string; Icon: React.ElementType; badge: string }> = {
  text:            { en: "Message",       ta: "செய்தி",         Icon: MessageCircle, badge: "bg-primary/10 text-primary" },
  edit_request:    { en: "Edit Request",  ta: "Edit கோரிக்கை", Icon: Edit3,         badge: "bg-amber-500/10 text-amber-600" },
  doubt:           { en: "Doubt",         ta: "சந்தேகம்",       Icon: HelpCircle,    badge: "bg-violet-500/10 text-violet-600" },
  contact_request: { en: "Contact Admin", ta: "Admin தொடர்பு",  Icon: Phone,         badge: "bg-rose-500/10 text-rose-600" },
};

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
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

// LocalStorage persistence
const STORAGE_KEY = (sid: string) => `amv_chat_${sid}`;
function loadMessages(sid: string): Message[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY(sid)) ?? "[]"); }
  catch { return []; }
}
function saveMessages(sid: string, msgs: Message[]) {
  // Keep last 200 messages only
  const trimmed = msgs.slice(-200);
  try { localStorage.setItem(STORAGE_KEY(sid), JSON.stringify(trimmed)); } catch {}
}
function clearMessages(sid: string) {
  try { localStorage.removeItem(STORAGE_KEY(sid)); } catch {}
}

// ─── Bubble ───────────────────────────────────────────────────────────────────
function Bubble({ msg, isMine, lang }: { msg: Message; isMine: boolean; lang: "en" | "ta" }) {
  const { Icon, badge, en, ta } = MSG_META[msg.type];
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 440, damping: 32 }}
      className={`flex ${isMine ? "justify-end" : "justify-start"} mb-1.5`}
    >
      {!isMine && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mr-2 mt-auto mb-0.5 shrink-0">
          <User2 className="w-3.5 h-3.5 text-white" />
        </div>
      )}
      <div className={`max-w-[76%] flex flex-col gap-0.5 ${isMine ? "items-end" : "items-start"}`}>
        {msg.type !== "text" && (
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge} ${isMine ? "self-end" : "self-start"}`}>
            <Icon className="w-2.5 h-2.5" />
            {L(lang, en, ta)}
          </span>
        )}
        <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
          isMine
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-secondary text-secondary-foreground rounded-bl-sm"
        }`}>
          {msg.text}
        </div>
        <div className={`flex items-center gap-1 text-[10px] text-muted-foreground ${isMine ? "justify-end" : "justify-start"}`}>
          <Clock className="w-2.5 h-2.5" />
          {fmtTime(msg.ts)}
          {isMine && <CheckCheck className={`w-3 h-3 ml-0.5 ${msg.isRead ? "text-primary" : "text-muted-foreground/40"}`} />}
        </div>
      </div>
    </motion.div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-3.5 py-2.5 bg-secondary rounded-2xl rounded-bl-sm w-fit ml-9 mb-2">
      {[0,1,2].map(i => (
        <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50"
          animate={{ y: [0, -5, 0] }}
          transition={{ repeat: Infinity, duration: 0.85, delay: i * 0.16 }}
        />
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ChatWindow({
  studentId, studentName, role, userId, lang = "en", onClose, floating = false,
}: Props) {
  const [messages, setMessages]     = useState<Message[]>(() => loadMessages(studentId));
  const [input, setInput]           = useState("");
  const [msgType, setMsgType]       = useState<MsgType>("text");
  const [sending, setSending]       = useState(false);
  const [open, setOpen]             = useState(!floating);
  const [unread, setUnread]         = useState(0);
  const [conn, setConn]             = useState<ConnState>("connecting");
  const [peerTyping, setPeerTyping] = useState(false);
  const [showDown, setShowDown]     = useState(false);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const scrollRef  = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Channel name — same for both sides
  const CHANNEL = `amv_chat_${studentId}`;

  // ── Subscribe ────────────────────────────────────────────────────────────
  useEffect(() => {
    const ch = supabase.channel(CHANNEL, {
      config: { broadcast: { self: false, ack: false } },
    });

    ch.on("broadcast", { event: "message" }, ({ payload }: { payload: Message }) => {
      setMessages(prev => {
        if (prev.some(m => m.id === payload.id)) return prev;
        const updated = [...prev, payload];
        saveMessages(studentId, updated);
        return updated;
      });
      if (floating && !open && payload.senderRole !== role) {
        setUnread(u => u + 1);
      }
      setPeerTyping(false);
    });

    ch.on("broadcast", { event: "typing" }, ({ payload }: { payload: { role: Role } }) => {
      if (payload.role !== role) {
        setPeerTyping(true);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setPeerTyping(false), 2500);
      }
    });

    ch.on("broadcast", { event: "read" }, ({ payload }: { payload: { role: Role } }) => {
      if (payload.role !== role) {
        setMessages(prev => {
          const updated = prev.map(m => m.senderRole === role ? { ...m, isRead: true } : m);
          saveMessages(studentId, updated);
          return updated;
        });
      }
    });

    ch.on("broadcast", { event: "clear" }, () => {
      setMessages([]);
      clearMessages(studentId);
    });

    ch.subscribe(status => {
      if (status === "SUBSCRIBED")    setConn("connected");
      if (status === "CLOSED")        setConn("disconnected");
      if (status === "CHANNEL_ERROR") setConn("disconnected");
    });

    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [studentId, floating, open, role, CHANNEL]);

  // ── Auto-scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
  }, [messages, open]);

  // ── Send read receipt when window opens ─────────────────────────────────
  useEffect(() => {
    if (!open || !channelRef.current || conn !== "connected") return;
    channelRef.current.send({ type: "broadcast", event: "read", payload: { role } });
    setUnread(0);
    setMessages(prev => {
      const updated = prev.map(m => m.senderRole !== role ? { ...m, isRead: true } : m);
      saveMessages(studentId, updated);
      return updated;
    });
  }, [open, conn, role, studentId]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setShowDown(scrollHeight - scrollTop - clientHeight > 100);
  };

  // ── Typing broadcast ────────────────────────────────────────────────────
  const broadcastTyping = useCallback(() => {
    if (!channelRef.current || conn !== "connected") return;
    channelRef.current.send({ type: "broadcast", event: "typing", payload: { role } });
  }, [conn, role]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    broadcastTyping();
  };

  // ── Send ────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending || conn !== "connected") return;
    setSending(true);

    const msg: Message = {
      id: uid(),
      senderId: userId,
      senderRole: role,
      text,
      type: msgType,
      isRead: false,
      ts: Date.now(),
    };

    // Optimistic — add locally first
    setMessages(prev => {
      const updated = [...prev, msg];
      saveMessages(studentId, updated);
      return updated;
    });
    setInput("");
    setMsgType("text");

    try {
      await channelRef.current.send({ type: "broadcast", event: "message", payload: msg });
    } catch (e) {
      console.error("[Chat] send:", e);
      toast.error(L(lang, "Send failed. Check connection.", "அனுப்பல் தோல்வி."));
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleClear = () => {
    if (!channelRef.current) return;
    setMessages([]);
    clearMessages(studentId);
    channelRef.current.send({ type: "broadcast", event: "clear", payload: {} });
    toast.success(L(lang, "Chat cleared", "Chat அழிக்கப்பட்டது"));
  };

  const bodyProps = {
    messages, role, userId, studentName, lang,
    input, handleInput, msgType, setMsgType,
    sending, handleSend, handleKeyDown,
    bottomRef, scrollRef, handleScroll, showDown,
    conn, peerTyping, handleClear,
    onClose,
  };

  // ─── Floating (student) ────────────────────────────────────────────────
  if (floating) {
    return (
      <div className="fixed bottom-6 right-4 z-50 flex flex-col items-end gap-3">
        <AnimatePresence>
          {open && (
            <motion.div
              key="chat-panel"
              initial={{ opacity: 0, y: 28, scale: 0.90 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 28, scale: 0.90 }}
              transition={{ type: "spring", stiffness: 340, damping: 26 }}
              className="w-[330px] sm:w-[375px] h-[490px] rounded-3xl shadow-2xl border border-border/60 flex flex-col overflow-hidden glass-card"
              style={{ backdropFilter: "blur(24px)" }}
            >
              <ChatBody {...bodyProps} onClose={() => setOpen(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* FAB */}
        <motion.button
          whileTap={{ scale: 0.86 }} whileHover={{ scale: 1.07 }}
          onClick={() => { setOpen(v => !v); if (!open) setUnread(0); }}
          className="w-14 h-14 rounded-full gradient-primary shadow-2xl flex items-center justify-center relative"
        >
          <AnimatePresence mode="wait">
            {open
              ? <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.16 }}><X className="w-5 h-5 text-white" /></motion.div>
              : <motion.div key="c" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.16 }}><MessageCircle className="w-6 h-6 text-white" /></motion.div>
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

  // ─── Inline (admin) ────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-[420px] rounded-2xl border border-border/50 overflow-hidden glass-card">
      <ChatBody {...bodyProps} />
    </div>
  );
}

// ─── ChatBody ─────────────────────────────────────────────────────────────────
interface BodyProps {
  messages: Message[];
  role: Role;
  userId: string;
  studentName: string;
  lang: "en" | "ta";
  input: string;
  handleInput: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  msgType: MsgType;
  setMsgType: (v: MsgType) => void;
  sending: boolean;
  handleSend: () => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  bottomRef: React.RefObject<HTMLDivElement>;
  scrollRef: React.RefObject<HTMLDivElement>;
  handleScroll: () => void;
  showDown: boolean;
  conn: ConnState;
  peerTyping: boolean;
  handleClear: () => void;
  onClose?: () => void;
}

function ChatBody({
  messages, role, userId, studentName, lang,
  input, handleInput, msgType, setMsgType, sending,
  handleSend, handleKeyDown, bottomRef, scrollRef,
  handleScroll, showDown, conn, peerTyping, handleClear, onClose,
}: BodyProps) {
  const grouped = groupByDate(messages);
  const QUICK: MsgType[] = role === "student"
    ? ["text", "edit_request", "doubt", "contact_request"]
    : ["text"];

  const connColor = conn === "connected" ? "bg-emerald-400" : conn === "connecting" ? "bg-amber-400 animate-pulse" : "bg-rose-500";
  const connText  = conn === "connected"
    ? L(lang, "Live • Real-time", "Live • Real-time")
    : conn === "connecting"
    ? L(lang, "Connecting…", "இணைக்கிறது…")
    : L(lang, "Offline", "Offline");

  return (
    <div className="flex flex-col h-full relative">
      {/* ── Header ── */}
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
            {conn === "connected"
              ? <Wifi className="w-3 h-3 text-emerald-500" />
              : conn === "connecting"
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <WifiOff className="w-3 h-3 text-rose-500" />
            }
            {connText}
          </p>
        </div>
        {/* Clear button (admin only) */}
        {role === "admin" && messages.length > 0 && (
          <button
            onClick={handleClear}
            title="Clear chat"
            className="text-muted-foreground hover:text-rose-500 transition-colors p-1 rounded-lg hover:bg-rose-500/10"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
        {onClose && (
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary transition-colors ml-1">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Messages ── */}
      <div
        ref={scrollRef} onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-4 scroll-smooth"
        style={{ scrollbarWidth: "thin" }}
      >
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
                  <span className="text-[10px] font-medium text-muted-foreground px-2.5 py-0.5 rounded-full bg-secondary">
                    {group.date}
                  </span>
                  <div className="h-px flex-1 bg-border/40" />
                </div>
                {group.msgs.map(msg => (
                  <Bubble
                    key={msg.id} msg={msg} lang={lang}
                    isMine={msg.senderId === userId || msg.senderRole === role}
                  />
                ))}
              </div>
            ))}
            {peerTyping && <TypingDots />}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Scroll button ── */}
      <AnimatePresence>
        {showDown && (
          <motion.button
            initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}
            onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="absolute bottom-[136px] right-3 w-8 h-8 rounded-full bg-primary text-white shadow-lg flex items-center justify-center z-10"
          >
            <ChevronDown className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Quick type (student only) ── */}
      {role === "student" && (
        <div className="flex gap-1.5 px-3 pt-2 pb-1.5 flex-wrap shrink-0 border-t border-border/30 bg-card/30">
          {QUICK.map(type => {
            const { Icon, en, ta, badge } = MSG_META[type];
            const active = msgType === type;
            return (
              <button
                key={type}
                onClick={() => setMsgType(type)}
                className={`flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all duration-150 ${
                  active ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border text-muted-foreground hover:border-primary/70 hover:text-primary"
                }`}
              >
                <Icon className="w-2.5 h-2.5" />
                {L(lang, en, ta)}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Input ── */}
      <div className="flex items-end gap-2 px-3 pb-3 pt-2 border-t border-border/40 shrink-0 bg-card/50">
        <Textarea
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={conn === "disconnected"}
          placeholder={
            conn === "disconnected"
              ? L(lang, "Offline — reconnecting…", "Offline — இணைக்கிறது…")
              : L(lang,
                  role === "admin" ? "Reply to student…" : "Type your message…",
                  role === "admin" ? "Student-க்கு reply…" : "உங்கள் message இங்கே…"
                )
          }
          className="resize-none text-sm rounded-xl min-h-[42px] max-h-[110px] bg-secondary border-0 focus-visible:ring-1 focus-visible:ring-primary"
          rows={1}
        />
        <Button
          onClick={handleSend}
          disabled={sending || !input.trim() || conn !== "connected"}
          size="icon"
          className="gradient-primary text-primary-foreground rounded-xl h-10 w-10 shrink-0 shadow-md"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
