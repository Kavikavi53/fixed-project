/**
 * ChatWindow.tsx
 * Real-time chat between Admin and Student via Supabase Realtime.
 *
 * Usage (Admin):
 *   <ChatWindow studentId={student.id} studentName={student.full_name} role="admin" userId={adminUid} lang={lang} />
 *
 * Usage (Student):
 *   <ChatWindow studentId={myStudent.id} studentName={myStudent.full_name} role="student" userId={myUid} lang={lang} />
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, X, MessageCircle, CheckCheck, Clock, Loader2,
  AlertCircle, Edit3, HelpCircle, Phone, User2, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────
type MessageType = "text" | "edit_request" | "doubt" | "contact_request";
type SenderRole  = "admin" | "student";

interface ChatMessage {
  id: string;
  student_id: string;
  sender_role: SenderRole;
  sender_id: string | null;
  message: string;
  message_type: MessageType;
  is_read: boolean;
  created_at: string;
}

interface Props {
  studentId: string;
  studentName: string;
  role: SenderRole;
  userId: string;
  lang?: "en" | "ta";
  onClose?: () => void;
  /** If true, renders as a floating bubble (student view). Default: false (admin panel view) */
  floating?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const t = (lang: "en" | "ta", en: string, ta: string) =>
  lang === "en" ? en : ta;

const MESSAGE_TYPE_LABELS: Record<MessageType, { en: string; ta: string; icon: React.ElementType; color: string }> = {
  text:            { en: "Message",        ta: "செய்தி",           icon: MessageCircle, color: "bg-primary/10 text-primary" },
  edit_request:    { en: "Edit Request",   ta: "Edit கோரிக்கை",   icon: Edit3,         color: "bg-amber-500/10 text-amber-600" },
  doubt:           { en: "Doubt",          ta: "சந்தேகம்",         icon: HelpCircle,    color: "bg-violet-500/10 text-violet-600" },
  contact_request: { en: "Contact Admin",  ta: "Admin தொடர்பு",   icon: Phone,          color: "bg-rose-500/10 text-rose-600" },
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
}

// Group messages by date
function groupByDate(msgs: ChatMessage[]) {
  const groups: { date: string; messages: ChatMessage[] }[] = [];
  let currentDate = "";
  for (const m of msgs) {
    const label = formatDateLabel(m.created_at);
    if (label !== currentDate) {
      currentDate = label;
      groups.push({ date: label, messages: [m] });
    } else {
      groups[groups.length - 1].messages.push(m);
    }
  }
  return groups;
}

// ─── MessageBubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg, isMine, lang }: { msg: ChatMessage; isMine: boolean; lang: "en" | "ta" }) {
  const meta = MESSAGE_TYPE_LABELS[msg.message_type];
  const Icon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={`flex ${isMine ? "justify-end" : "justify-start"} mb-1`}
    >
      {!isMine && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mr-2 mt-auto mb-0.5 shrink-0">
          <User2 className="w-3.5 h-3.5 text-white" />
        </div>
      )}
      <div className={`max-w-[75%] ${isMine ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
        {/* Type badge (non-text) */}
        {msg.message_type !== "text" && (
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${meta.color} ${isMine ? "self-end" : "self-start"}`}>
            <Icon className="w-2.5 h-2.5" />
            {t(lang, meta.en, meta.ta)}
          </span>
        )}
        <div
          className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
            isMine
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-secondary text-secondary-foreground rounded-bl-sm"
          }`}
        >
          {msg.message}
        </div>
        <div className={`flex items-center gap-1 text-[10px] text-muted-foreground ${isMine ? "justify-end" : "justify-start"}`}>
          <Clock className="w-2.5 h-2.5" />
          {formatTime(msg.created_at)}
          {isMine && (
            msg.is_read
              ? <CheckCheck className="w-3 h-3 text-primary ml-0.5" />
              : <CheckCheck className="w-3 h-3 text-muted-foreground/50 ml-0.5" />
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ChatWindow({
  studentId, studentName, role, userId, lang = "en", onClose, floating = false,
}: Props) {
  const [messages, setMessages]   = useState<ChatMessage[]>([]);
  const [input, setInput]         = useState("");
  const [msgType, setMsgType]     = useState<MessageType>("text");
  const [sending, setSending]     = useState(false);
  const [loading, setLoading]     = useState(true);
  const [open, setOpen]           = useState(!floating);
  const [unread, setUnread]       = useState(0);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const scrollRef  = useRef<HTMLDivElement>(null);

  // ── Fetch history ──────────────────────────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: true });
    if (error) { toast.error("Failed to load chat: " + error.message); }
    else { setMessages((data as ChatMessage[]) ?? []); }
    setLoading(false);
  }, [studentId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${studentId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `student_id=eq.${studentId}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          if (floating && !open && newMsg.sender_role !== role) {
            setUnread(u => u + 1);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
          filter: `student_id=eq.${studentId}`,
        },
        (payload) => {
          const updated = payload.new as ChatMessage;
          setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [studentId, floating, open, role]);

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
    }
  }, [messages, open]);

  // ── Mark messages as read when window is open ──────────────────────────────
  useEffect(() => {
    if (!open || messages.length === 0) return;
    const unreadFromOther = messages.filter(
      m => !m.is_read && m.sender_role !== role
    );
    if (unreadFromOther.length === 0) return;
    const ids = unreadFromOther.map(m => m.id);
    supabase
      .from("chat_messages")
      .update({ is_read: true })
      .in("id", ids)
      .then(() => {});
    setUnread(0);
  }, [open, messages, role]);

  // ── Scroll detection ───────────────────────────────────────────────────────
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 120);
  };

  // ── Send ───────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        student_id:   studentId,
        sender_role:  role,
        sender_id:    user?.id ?? userId,
        message:      text,
        message_type: msgType,
      };
      const { error } = await supabase.from("chat_messages").insert(payload);
      if (error) {
        console.error("Chat send error:", error);
        toast.error(`Error: ${error.message}`);
      } else {
        setInput("");
        setMsgType("text");
      }
    } catch (e: any) {
      console.error("Chat exception:", e);
      toast.error(`Exception: ${e?.message ?? "unknown"}`);
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ─── Floating bubble (student) ─────────────────────────────────────────────
  if (floating) {
    return (
      <div className="fixed bottom-6 right-4 z-50 flex flex-col items-end gap-3">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.93 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.93 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="w-[330px] sm:w-[370px] h-[480px] rounded-3xl shadow-2xl border border-border/50 flex flex-col overflow-hidden glass-card"
              style={{ backdropFilter: "blur(20px)" }}
            >
              <ChatBody
                messages={messages} loading={loading} role={role} userId={userId}
                studentName={studentName} lang={lang} input={input} setInput={setInput}
                msgType={msgType} setMsgType={setMsgType} sending={sending}
                handleSend={handleSend} handleKeyDown={handleKeyDown}
                bottomRef={bottomRef} scrollRef={scrollRef} onScroll={handleScroll}
                showScrollBtn={showScrollBtn}
                onClose={() => setOpen(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fab button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => { setOpen(v => !v); setUnread(0); }}
          className="w-14 h-14 rounded-full gradient-primary shadow-xl flex items-center justify-center relative"
        >
          {open
            ? <X className="w-5 h-5 text-white" />
            : <MessageCircle className="w-6 h-6 text-white" />
          }
          {unread > 0 && !open && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </motion.button>
      </div>
    );
  }

  // ─── Inline (admin panel) ──────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-[420px] rounded-2xl border border-border/50 overflow-hidden glass-card">
      <ChatBody
        messages={messages} loading={loading} role={role} userId={userId}
        studentName={studentName} lang={lang} input={input} setInput={setInput}
        msgType={msgType} setMsgType={setMsgType} sending={sending}
        handleSend={handleSend} handleKeyDown={handleKeyDown}
        bottomRef={bottomRef} scrollRef={scrollRef} onScroll={handleScroll}
        showScrollBtn={showScrollBtn}
        onClose={onClose}
      />
    </div>
  );
}

// ─── ChatBody (shared UI) ─────────────────────────────────────────────────────
function ChatBody({
  messages, loading, role, userId, studentName, lang,
  input, setInput, msgType, setMsgType, sending,
  handleSend, handleKeyDown, bottomRef, scrollRef, onScroll, showScrollBtn, onClose,
}: {
  messages: ChatMessage[];
  loading: boolean;
  role: SenderRole;
  userId: string;
  studentName: string;
  lang: "en" | "ta";
  input: string;
  setInput: (v: string) => void;
  msgType: MessageType;
  setMsgType: (v: MessageType) => void;
  sending: boolean;
  handleSend: () => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  bottomRef: React.RefObject<HTMLDivElement>;
  scrollRef: React.RefObject<HTMLDivElement>;
  onScroll: () => void;
  showScrollBtn: boolean;
  onClose?: () => void;
}) {
  const grouped = groupByDate(messages);
  const QUICK_TYPES: MessageType[] = role === "student"
    ? ["text", "edit_request", "doubt", "contact_request"]
    : ["text"];

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-card/60">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center shrink-0">
          <User2 className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">
            {role === "student" ? t(lang, "Admin", "Admin") : studentName}
          </p>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            {t(lang, "Real-time chat", "Real-time chat")}
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5 scroll-smooth"
        style={{ scrollbarWidth: "thin" }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <MessageCircle className="w-10 h-10 opacity-20" />
            <p className="text-sm text-center">
              {t(lang, "No messages yet. Start the conversation!", "இன்னும் செய்தி இல்லை. பேசுங்கள்!")}
            </p>
          </div>
        ) : (
          grouped.map(group => (
            <div key={group.date}>
              {/* Date separator */}
              <div className="flex items-center gap-2 my-4">
                <div className="h-px flex-1 bg-border/50" />
                <span className="text-[10px] font-medium text-muted-foreground px-2 py-0.5 rounded-full bg-secondary">
                  {group.date}
                </span>
                <div className="h-px flex-1 bg-border/50" />
              </div>
              {group.messages.map(msg => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  isMine={msg.sender_id === userId || (msg.sender_role === role && !msg.sender_id)}
                  lang={lang}
                />
              ))}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="absolute bottom-20 right-4 w-8 h-8 rounded-full bg-primary text-white shadow-lg flex items-center justify-center"
          >
            <ChevronDown className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Quick-type selector (student only) */}
      {role === "student" && (
        <div className="flex gap-1.5 px-3 pt-2 flex-wrap">
          {QUICK_TYPES.map(type => {
            const meta = MESSAGE_TYPE_LABELS[type];
            const Icon = meta.icon;
            const active = msgType === type;
            return (
              <button
                key={type}
                onClick={() => setMsgType(type)}
                className={`flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                }`}
              >
                <Icon className="w-2.5 h-2.5" />
                {t(lang, meta.en, meta.ta)}
              </button>
            );
          })}
        </div>
      )}

      {/* Input */}
      <div className="flex items-end gap-2 px-3 pb-3 pt-2 border-t border-border/40">
        <Textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t(lang,
            role === "admin" ? "Reply to student..." : "Type your message...",
            role === "admin" ? "Student-க்கு reply பண்ணுங்க..." : "உங்கள் message இங்கே..."
          )}
          className="resize-none text-sm rounded-xl min-h-[42px] max-h-[100px] bg-secondary border-0 focus-visible:ring-1"
          rows={1}
        />
        <Button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          size="icon"
          className="gradient-primary text-primary-foreground rounded-xl h-10 w-10 shrink-0"
        >
          {sending
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Send className="w-4 h-4" />
          }
        </Button>
      </div>
    </>
  );
}
