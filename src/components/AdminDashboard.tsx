import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, DollarSign, AlertTriangle, CheckCircle, Search,
  Plus, Trash2, ShieldAlert, ShieldCheck, Megaphone, ClipboardList, Pencil, FileDown,
  FileText, Upload, X, Filter, Zap, Bell, MessageCircle,
} from "lucide-react";
import ChatWindow, { getUnreadCount } from "./ChatWindow";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import StatusBadge from "./StatusBadge";
import EditStudentDialog from "./EditStudentDialog";
import StatsCard from "./StatsCard";
import ReportsTab from "./ReportsTab";
import StudentAvatar from "./StudentAvatar";
import LiveClock from "./LiveClock";
import { supabase } from "@/integrations/supabase/client";
import type { Student, Announcement, AuditEntry, PaymentHistory, PaymentStatus, Batch, Stream } from "@/lib/store";

interface Props {
  students: Student[];
  announcements: Announcement[];
  audit: AuditEntry[];
  loading: boolean;
  paymentHistory: PaymentHistory[];
  onUpdatePayment: (id: string, status: PaymentStatus) => Promise<void>;
  onDeleteStudent: (id: string) => Promise<void>;
  onToggleBlock: (id: string) => Promise<void>;
  onAddAnnouncement: (title: string, message: string, urgent: boolean) => Promise<void>;
  onDeleteAnnouncement: (id: string) => Promise<void>;
  onAddStudent: (student: any) => Promise<any>;
  onUpdateStudent: (id: string, updates: Partial<Student>) => Promise<void>;
  lang?: "en" | "ta";
}

const T = (lang: "en" | "ta", en: string, ta: string) => lang === "en" ? en : ta;

export default function AdminDashboard({
  students, announcements, audit, loading, paymentHistory,
  onUpdatePayment, onDeleteStudent, onToggleBlock,
  onAddAnnouncement, onDeleteAnnouncement, onAddStudent, onUpdateStudent,
  lang = "en",
}: Props) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState("all");
  const [streamFilter, setStreamFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [annTitle, setAnnTitle] = useState("");
  const [annMsg, setAnnMsg] = useState("");
  const [annUrgent, setAnnUrgent] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [addError, setAddError] = useState("");
  const [addLetterFile, setAddLetterFile] = useState<File | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Student | null>(null);
  const [confirmBlock, setConfirmBlock] = useState<Student | null>(null);
  const [confirmEdit, setConfirmEdit] = useState<Student | null>(null);
  const [confirmPayment, setConfirmPayment] = useState<{ student: Student; status: PaymentStatus } | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [chatStudent, setChatStudent] = useState<Student | null>(null);
  const [adminUserId, setAdminUserId] = useState<string>("");
  const [showMyPaid, setShowMyPaid] = useState(false);
  // Per-student unread counts for sidebar badges
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  // Per-student last message timestamp (for sorting sidebar list)
  const [lastMsgMap, setLastMsgMap] = useState<Record<string, number>>({});
  const chatStudentRef = useRef<Student | null>(null);
  chatStudentRef.current = chatStudent;

  // Initialize unread counts from localStorage on mount
  useEffect(() => {
    const map: Record<string, number> = {};
    students.forEach(s => {
      const n = getUnreadCount(s.id);
      if (n > 0) map[s.id] = n;
    });
    setUnreadMap(map);
  }, [students]);

  const handleUnreadChange = useCallback((sid: string, count: number) => {
    setUnreadMap(prev => ({ ...prev, [sid]: count }));
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.id) setAdminUserId(data.user.id);
    });
  }, []);

  // ── Global Admin Realtime Listener ──────────────────────────────────────────
  // Listens to DB inserts on chat_messages for ALL students (sent by student role).
  // This ensures admin gets notified even when offline / on a different tab.
  useEffect(() => {
    if (!students.length) return;

    // 1. On mount: fetch all unread student→admin messages from DB
    const fetchAllUnread = async () => {
      try {
        const { data } = await supabase
          .from("chat_messages")
          .select("student_id, created_at")
          .eq("sender_role", "student")
          .eq("is_read", false)
          .order("created_at", { ascending: false });

        if (!data?.length) return;
        const countMap: Record<string, number> = {};
        const tsMap: Record<string, number> = {};
        data.forEach(row => {
          countMap[row.student_id] = (countMap[row.student_id] ?? 0) + 1;
          if (!tsMap[row.student_id]) tsMap[row.student_id] = new Date(row.created_at).getTime();
        });
        setUnreadMap(prev => {
          const next = { ...prev };
          Object.entries(countMap).forEach(([sid, n]) => { next[sid] = n; });
          return next;
        });
        setLastMsgMap(prev => ({ ...prev, ...tsMap }));
      } catch (e) {
        console.error("[AdminDashboard] fetchAllUnread error:", e);
      }
    };
    fetchAllUnread();

    // 2. Realtime subscription: new student messages → update badge + toast + sort
    const channel = supabase
      .channel("admin_global_chat_listener", { config: { broadcast: { self: false } } })
      .on(
        "postgres_changes" as any,
        { event: "INSERT", schema: "public", table: "chat_messages", filter: "sender_role=eq.student" },
        (payload: any) => {
          const row = payload.new;
          const sid: string = row.student_id;
          const ts: number = new Date(row.created_at).getTime();
          const student = students.find(s => s.id === sid);

          // Update last message timestamp for sorting
          setLastMsgMap(prev => ({ ...prev, [sid]: ts }));

          // If this student's chat is already open and visible, don't bump unread
          const isOpen = chatStudentRef.current?.id === sid;
          if (!isOpen) {
            setUnreadMap(prev => ({ ...prev, [sid]: (prev[sid] ?? 0) + 1 }));
            // Toast notification
            const name = student?.full_name ?? "Student";
            toast(`💬 ${name}`, {
              description: (row.message ?? "").slice(0, 70) + ((row.message?.length ?? 0) > 70 ? "…" : ""),
              duration: 5000,
              action: { label: "Open", onClick: () => student && setChatStudent(student) },
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [students]);

  // Flash highlight helper — row-ஐ briefly highlight பண்ணும்
  const flashRow = useCallback((id: string) => {
    setFlashId(id);
    setTimeout(() => setFlashId(null), 1500);
  }, []);

  // Real-time payment update with toast + flash
  const handlePaymentUpdate = useCallback(async (student: Student, status: PaymentStatus) => {
    setProcessingId(student.id);
    const statusLabel = status === "paid" ? "✅ Paid" : status === "pending" ? "⏳ Pending" : "⚠️ Late";
    const toastId = toast.loading(`Updating ${student.full_name}...`);
    try {
      await onUpdatePayment(student.id, status);
      flashRow(student.id);
      toast.success(`${student.full_name} → ${statusLabel}`, {
        id: toastId,
        description: new Date().toLocaleTimeString(),
        duration: 3000,
      });
    } catch {
      toast.error("Update failed. Try again.", { id: toastId });
    } finally {
      setProcessingId(null);
    }
  }, [onUpdatePayment, flashRow]);

  // Real-time announcement add with toast
  const handleAddAnnouncement = useCallback(async () => {
    if (!annTitle.trim() || !annMsg.trim()) {
      toast.error("Title and message required!");
      return;
    }
    const toastId = toast.loading("Posting announcement...");
    try {
      await onAddAnnouncement(annTitle, annMsg, annUrgent);
      setAnnTitle(""); setAnnMsg(""); setAnnUrgent(false);
      toast.success(annUrgent ? "🚨 Urgent announcement posted!" : "📢 Announcement posted!", {
        id: toastId, duration: 3000,
      });
    } catch {
      toast.error("Failed to post. Try again.", { id: toastId });
    }
  }, [annTitle, annMsg, annUrgent, onAddAnnouncement]);

  // Real-time announcement delete with toast
  const handleDeleteAnnouncement = useCallback(async (id: string, title: string) => {
    const toastId = toast.loading("Deleting...");
    try {
      await onDeleteAnnouncement(id);
      toast.success(`"${title}" deleted`, { id: toastId, duration: 2000 });
    } catch {
      toast.error("Delete failed.", { id: toastId });
    }
  }, [onDeleteAnnouncement]);
  const [newStudent, setNewStudent] = useState({
    full_name: "", address: "", dob: "", nic: "", email: "",
    school_id: "", batch: "2026" as Batch, stream: "Mathematics" as Stream,
    student_phone: "", parent_name: "", parent_phone: "",
  });

  useState(() => {
    supabase.auth.getUser().then(({ data }) => setAdminEmail(data.user?.email ?? null));
  });

  const isAddLetterRequired = newStudent.batch === "2028" || newStudent.batch === "2029";

  const filtered = useMemo(() => students.filter(s => {
    if (search && !s.full_name.toLowerCase().includes(search.toLowerCase()) && !s.auto_id.toLowerCase().includes(search.toLowerCase())) return false;
    if (batchFilter !== "all" && s.batch !== batchFilter) return false;
    if (streamFilter !== "all" && s.stream !== streamFilter) return false;
    if (statusFilter !== "all" && s.payment_status !== statusFilter) return false;
    return true;
  }), [students, search, batchFilter, streamFilter, statusFilter]);

  const stats = useMemo(() => {
    const paid = students.filter(s => s.payment_status === "paid").length;
    const pending = students.filter(s => s.payment_status === "pending").length;
    const late = students.filter(s => s.payment_status === "late").length;
    return { total: students.length, paid, pending, late, income: paid * 530 };
  }, [students]);

  const yourStats = useMemo(() => {
    const mine = students.filter(s => (s as any).payment_marked_by === adminEmail && s.payment_status === "paid");
    return { paid: mine.length, income: mine.length * 530 };
  }, [students, adminEmail]);

  const handleAddStudent = async () => {
    const checks: [string, string][] = [
      [newStudent.full_name.trim(), T(lang, "Full name is required", "பெயர் தேவை")],
      [newStudent.student_phone.trim(), T(lang, "Student phone is required", "தொலைபேசி தேவை")],
      [newStudent.nic.trim(), T(lang, "NIC is required", "NIC தேவை")],
      [newStudent.dob.trim(), T(lang, "Date of Birth is required", "பிறந்த தேதி தேவை")],
      [newStudent.address.trim(), T(lang, "Address is required", "முகவரி தேவை")],
      [newStudent.school_id.trim(), T(lang, "School ID is required", "பள்ளி ID தேவை")],
      [newStudent.email.trim(), T(lang, "Email is required", "மின்னஞ்சல் தேவை")],
      [newStudent.parent_name.trim(), T(lang, "Parent name is required", "பெற்றோர் பெயர் தேவை")],
      [newStudent.parent_phone.trim(), T(lang, "Parent phone is required", "பெற்றோர் தொலைபேசி தேவை")],
    ];
    for (const [val, msg] of checks) { if (!val) { setAddError(msg); return; } }
    if (isAddLetterRequired && !addLetterFile) {
      setAddError(T(lang, "Permission letter required for 2028/2029", "2028/2029 batch-க்கு கடிதம் தேவை"));
      return;
    }
    setAddError("");

    const { data: existing } = await supabase.from("students").select("id").ilike("email", newStudent.email.trim()).maybeSingle();
    if (existing) { setAddError(T(lang, "Email already registered!", "இந்த email ஏற்கனவே பதிவு ஆச்சு!")); return; }

    const result = await onAddStudent(newStudent);
    if (result?.error) {
      setAddError(result.error.message?.includes("duplicate")
        ? T(lang, "Email already registered!", "இந்த email ஏற்கனவே பதிவு ஆச்சு!")
        : result.error.message);
      return;
    }

    if (addLetterFile && result?.data?.id) {
      const ext = addLetterFile.name.split(".").pop();
      const { data: uploadData } = await supabase.storage.from("permission-letters").upload(`admin_${result.data.id}_permission_letter.${ext}`, addLetterFile, { upsert: true });
      if (uploadData) await supabase.from("students").update({ permission_letter_url: uploadData.path }).eq("id", result.data.id);
    }

    setAddOpen(false);
    setAddLetterFile(null);
    setNewStudent({ full_name: "", address: "", dob: "", nic: "", email: "", school_id: "", batch: "2026", stream: "Mathematics", student_phone: "", parent_name: "", parent_phone: "" });
  };

  const handleAddStudentAnnouncement_removed = null; // replaced by useCallback above

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="pb-20 px-3 pt-3 max-w-7xl mx-auto space-y-3">

      {/* Month + Clock */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl px-4 py-3 flex items-center justify-between border border-primary/20">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
            {T(lang, "Current Month", "தற்போதைய மாதம்")}
          </p>
          <p className="text-sm font-bold text-foreground">
            {new Date().toLocaleString(lang === "ta" ? "ta-IN" : "en-IN", { month: "long", year: "numeric" })}
          </p>
        </div>
        <LiveClock />
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <StatsCard title={T(lang, "Total", "மொத்தம்")} value={stats.total} icon={Users} delay={0} />
        <StatsCard title={T(lang, "Paid", "செலுத்தியது")} value={stats.paid} icon={CheckCircle} variant="success" delay={0.05} />
        <StatsCard title={T(lang, "Pending", "நிலுவை")} value={stats.pending} icon={AlertTriangle} variant="destructive" delay={0.1} />
        <StatsCard title={T(lang, "Late", "தாமதம்")} value={stats.late} icon={AlertTriangle} variant="warning" delay={0.15} />
        <div className="col-span-2 sm:col-span-1">
          <StatsCard title={T(lang, "Income", "வருமானம்")} value={`Rs. ${stats.income.toLocaleString()}`} icon={DollarSign} delay={0.2} />
        </div>
      </div>

      {/* Your Stats - Clickable to show paid students */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="glass-card rounded-2xl px-4 py-3 flex items-center gap-3 border border-primary/20 cursor-pointer hover:border-primary/50 transition-colors active:scale-[0.99]"
        onClick={() => setShowMyPaid(true)}>
        <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-base flex-shrink-0">👤</div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide truncate">
            {T(lang, "Your Collections", "உங்கள் வசூல்")} {adminEmail && <span className="text-primary ml-1 normal-case">— {adminEmail}</span>}
          </p>
          <p className="text-xs font-semibold text-foreground mt-0.5">
            {T(lang, "Paid", "செலுத்தியது")}: <span className="text-emerald-500">{yourStats.paid}</span>
            <span className="mx-2 text-muted-foreground">|</span>
            {T(lang, "Income", "வருமானம்")}: <span className="text-primary">Rs. {yourStats.income.toLocaleString()}</span>
          </p>
        </div>
        <span className="text-xs text-primary/60 flex-shrink-0">▶</span>
      </motion.div>

            {/* Tabs */}
      <Tabs defaultValue="students" className="space-y-3">
        <TabsList className="glass-card border-border/50 w-full grid grid-cols-5 h-10">
          <TabsTrigger value="students" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Users className="w-3.5 h-3.5 mr-1 hidden sm:inline" />{T(lang, "Students", "மாணவர்")}
          </TabsTrigger>
          <TabsTrigger value="announcements" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Megaphone className="w-3.5 h-3.5 mr-1 hidden sm:inline" />{T(lang, "Posts", "அறிவிப்பு")}
          </TabsTrigger>
          <TabsTrigger value="reports" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <FileDown className="w-3.5 h-3.5 mr-1 hidden sm:inline" />{T(lang, "Reports", "அறிக்கை")}
          </TabsTrigger>
          <TabsTrigger value="audit" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ClipboardList className="w-3.5 h-3.5 mr-1 hidden sm:inline" />{T(lang, "Log", "பதிவு")}
          </TabsTrigger>
          <TabsTrigger value="chat" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground relative">
            <MessageCircle className="w-3.5 h-3.5 mr-1 hidden sm:inline" />{T(lang, "Chat", "Chat")}
            {Object.values(unreadMap).reduce((a, b) => a + b, 0) > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                {Object.values(unreadMap).reduce((a, b) => a + b, 0) > 9 ? "9+" : Object.values(unreadMap).reduce((a, b) => a + b, 0)}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* STUDENTS */}
        <TabsContent value="students" className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder={T(lang, "Search name or ID...", "பெயர் அல்லது ID...")} value={search}
                onChange={e => setSearch(e.target.value)} className="pl-10 h-10 bg-secondary text-sm" />
            </div>
            <Button variant="outline" size="icon" className={`h-10 w-10 flex-shrink-0 ${showFilters ? "border-primary text-primary" : ""}`}
              onClick={() => setShowFilters(!showFilters)}>
              <Filter className="w-4 h-4" />
            </Button>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary text-primary-foreground h-10 px-3 flex-shrink-0">
                  <Plus className="w-4 h-4" /><span className="hidden sm:inline ml-1">{T(lang, "Add", "சேர்")}</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-card border-border max-h-[90vh] overflow-y-auto w-[calc(100vw-2rem)] max-w-lg">
                <DialogHeader><DialogTitle>{T(lang, "Add New Student", "புது மாணவர் சேர்")}</DialogTitle></DialogHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { key: "full_name", ph: T(lang, "Full Name *", "பெயர் *") },
                    { key: "school_id", ph: T(lang, "School ID *", "பள்ளி ID *") },
                    { key: "nic", ph: "NIC *" },
                    { key: "email", ph: T(lang, "Email *", "மின்னஞ்சல் *"), type: "email" },
                    { key: "dob", ph: T(lang, "DOB *", "பிறந்த தேதி *"), type: "date" },
                    { key: "address", ph: T(lang, "Address *", "முகவரி *") },
                    { key: "student_phone", ph: T(lang, "Student Phone *", "மாணவர் தொலைபேசி *") },
                    { key: "parent_name", ph: T(lang, "Parent Name *", "பெற்றோர் பெயர் *") },
                    { key: "parent_phone", ph: T(lang, "Parent Phone *", "பெற்றோர் தொலைபேசி *") },
                  ].map(({ key, ph, type }) => (
                    <Input key={key} placeholder={ph} type={type ?? "text"}
                      value={(newStudent as any)[key]}
                      onChange={e => { setNewStudent(p => ({ ...p, [key]: e.target.value })); setAddError(""); }}
                      className="bg-secondary h-10 text-sm" />
                  ))}
                  <Select value={newStudent.batch} onValueChange={v => setNewStudent(p => ({ ...p, batch: v as Batch }))}>
                    <SelectTrigger className="bg-secondary h-10 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{["2026","2027","2028","2029"].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={newStudent.stream} onValueChange={v => setNewStudent(p => ({ ...p, stream: v as Stream }))}>
                    <SelectTrigger className="bg-secondary h-10 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{["Mathematics","Bio Science","Commerce","Arts"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className={`mt-2 rounded-xl border-2 border-dashed p-3 text-center space-y-2 ${isAddLetterRequired ? "border-primary/50" : "border-border"}`}>
                  <p className="text-sm font-medium text-foreground flex items-center justify-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    {T(lang, "Permission Letter", "அனுமதி கடிதம்")} {isAddLetterRequired ? <span className="text-destructive">*</span> : <span className="text-xs text-muted-foreground">(Optional)</span>}
                  </p>
                  {addLetterFile ? (
                    <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2">
                      <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="flex-1 truncate text-xs text-left">{addLetterFile.name}</span>
                      <button onClick={() => setAddLetterFile(null)} className="text-muted-foreground hover:text-destructive"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) { setAddLetterFile(f); setAddError(""); } }} />
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium transition-colors">
                        <Upload className="w-4 h-4" /> {T(lang, "Choose File", "கோப்பு தேர்ந்தெடு")}
                      </div>
                    </label>
                  )}
                </div>
                {addError && <p className="text-xs text-destructive">{addError}</p>}
                <Button onClick={handleAddStudent} className="w-full gradient-primary text-primary-foreground h-11 rounded-xl mt-1">
                  {T(lang, "Add Student", "மாணவரை சேர்")}
                </Button>
              </DialogContent>
            </Dialog>
          </div>

          {/* Collapsible Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="grid grid-cols-3 gap-2 pb-1">
                  <Select value={batchFilter} onValueChange={setBatchFilter}>
                    <SelectTrigger className="h-9 bg-secondary text-xs"><SelectValue placeholder="Batch" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{T(lang, "All Batches", "எல்லா Batch")}</SelectItem>
                      {["2026","2027","2028","2029"].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={streamFilter} onValueChange={setStreamFilter}>
                    <SelectTrigger className="h-9 bg-secondary text-xs"><SelectValue placeholder="Stream" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{T(lang, "All Streams", "எல்லா Stream")}</SelectItem>
                      {["Mathematics","Bio Science","Commerce","Arts"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9 bg-secondary text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{T(lang, "All Status", "எல்லா நிலை")}</SelectItem>
                      <SelectItem value="paid">{T(lang, "Paid", "செலுத்தியது")}</SelectItem>
                      <SelectItem value="pending">{T(lang, "Pending", "நிலுவை")}</SelectItem>
                      <SelectItem value="late">{T(lang, "Late", "தாமதம்")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Desktop Table */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    {["ID", T(lang,"Name","பெயர்"), T(lang,"Batch","Batch"), T(lang,"Stream","Stream"), T(lang,"Payment","கட்டணம்"), T(lang,"Status","நிலை"), T(lang,"Actions","செயல்")].map(h => (
                      <th key={h} className="text-left p-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, i) => (
                    <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                      className="border-b border-border/40 hover:bg-secondary/30 transition-colors"
                      style={{ background: flashId === s.id ? "rgba(34,197,94,0.12)" : undefined, transition: "background 0.5s" }}>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{s.auto_id}</td>
                      <td className="p-3 cursor-pointer" onClick={() => navigate(`/student/${s.id}`)}>
                        <div className="flex items-center gap-2">
                          <StudentAvatar name={s.full_name} photoUrl={s.profile_photo_url} studentId={s.id} canUpload={false} size="sm" />
                          <span className="font-medium text-foreground hover:text-primary transition-colors">{s.full_name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">{s.batch}</td>
                      <td className="p-3 text-muted-foreground text-xs">{s.stream}</td>
                      <td className="p-3"><StatusBadge status={s.payment_status} /></td>
                      <td className="p-3">
                        <span className={`text-xs font-semibold ${s.account_status === "active" ? "text-emerald-500" : "text-destructive"}`}>{s.account_status}</span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <Select value={s.payment_status} onValueChange={v => setConfirmPayment({ student: s, status: v as PaymentStatus })}>
                            <SelectTrigger className="h-7 w-20 text-xs bg-secondary"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="paid">Paid</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="late">Late</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setConfirmEdit(s)}><Pencil className="w-3.5 h-3.5 text-primary" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setConfirmBlock(s)}>
                            {s.account_status === "active" ? <ShieldAlert className="w-3.5 h-3.5 text-amber-500" /> : <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setConfirmDelete(s)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-border/40">
              {filtered.map((s, i) => (
                <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="p-3 space-y-2.5">
                  <div className="flex items-center gap-3">
                    <div onClick={() => navigate(`/student/${s.id}`)} className="cursor-pointer flex-shrink-0">
                      <StudentAvatar name={s.full_name} photoUrl={s.profile_photo_url} studentId={s.id} canUpload={false} size="sm" />
                    </div>
                    <div className="flex-1 min-w-0" onClick={() => navigate(`/student/${s.id}`)}>
                      <p className="font-semibold text-foreground text-sm leading-tight truncate">{s.full_name}</p>
                      <p className="text-xs font-mono text-muted-foreground">{s.auto_id}</p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded-full text-muted-foreground">{s.batch}</span>
                        <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded-full text-muted-foreground">{s.stream}</span>
                        <StatusBadge status={s.payment_status} />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setConfirmEdit(s)}><Pencil className="w-3.5 h-3.5 text-primary" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setConfirmBlock(s)}>
                        {s.account_status === "active" ? <ShieldAlert className="w-3.5 h-3.5 text-amber-500" /> : <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setConfirmDelete(s)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                  <Select value={s.payment_status} onValueChange={v => setConfirmPayment({ student: s, status: v as PaymentStatus })}>
                    <SelectTrigger className="h-8 text-xs bg-secondary border-border w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">✓ {T(lang,"Paid","செலுத்தியது")}</SelectItem>
                      <SelectItem value="pending">⏳ {T(lang,"Pending","நிலுவை")}</SelectItem>
                      <SelectItem value="late">⚠ {T(lang,"Late","தாமதம்")}</SelectItem>
                    </SelectContent>
                  </Select>
                </motion.div>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                {T(lang, "No students found", "மாணவர்கள் கிடைக்கவில்லை")}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ANNOUNCEMENTS */}
        <TabsContent value="announcements" className="space-y-3">
          <div className="glass-card rounded-2xl p-4 space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm">
              <Megaphone className="w-4 h-4 text-primary" />{T(lang, "New Announcement", "புது அறிவிப்பு")}
            </h3>
            <Input placeholder={T(lang,"Title","தலைப்பு")} value={annTitle} onChange={e => setAnnTitle(e.target.value)} className="bg-secondary h-10 text-sm" />
            <Textarea placeholder={T(lang,"Message","செய்தி")} value={annMsg} onChange={e => setAnnMsg(e.target.value)} className="bg-secondary text-sm resize-none" rows={3} />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch checked={annUrgent} onCheckedChange={setAnnUrgent} />
                <Label className="text-sm text-muted-foreground">{T(lang,"Urgent Alert","அவசர எச்சரிக்கை")}</Label>
              </div>
              <Button onClick={handleAddAnnouncement} className="gradient-primary text-primary-foreground h-9 px-4 text-sm">
                {T(lang,"Post","பதிவிடு")}
              </Button>
            </div>
          </div>
          <div className="space-y-2.5">
            {announcements.map(a => (
              <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className={`glass-card rounded-2xl p-4 ${a.urgent ? "border-l-4 border-amber-500" : ""}`}>
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-foreground text-sm">{a.title}</h4>
                      {a.urgent && <span className="text-[10px] bg-amber-500/15 text-amber-500 font-bold px-1.5 py-0.5 rounded-full uppercase">Urgent</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{a.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-2">{new Date(a.created_at).toLocaleString()}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive flex-shrink-0" onClick={() => handleDeleteAnnouncement(a.id, a.title)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            ))}
            {announcements.length === 0 && <p className="text-center text-muted-foreground py-10 text-sm">{T(lang,"No announcements yet","இன்னும் அறிவிப்புகள் இல்லை")}</p>}
          </div>
        </TabsContent>

        {/* REPORTS */}
        <TabsContent value="reports">
          <ReportsTab students={students} paymentHistory={paymentHistory} />
        </TabsContent>

        {/* AUDIT */}
        <TabsContent value="audit">
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-foreground text-sm">{T(lang,"Audit Log","தணிக்கை பதிவு")}</h3>
            </div>
            <div className="divide-y divide-border/40 max-h-96 overflow-y-auto">
              {audit.map(a => (
                <div key={a.id} className="p-3 flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-foreground font-medium text-xs">{a.action}</p>
                    <p className="text-muted-foreground text-xs mt-0.5 leading-relaxed">{a.details}</p>
                    <p className="text-muted-foreground/60 text-[10px] mt-1">{new Date(a.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
              {audit.length === 0 && <p className="text-center text-muted-foreground py-10 text-sm">{T(lang,"No actions recorded","செயல்கள் பதிவு இல்லை")}</p>}
            </div>
          </div>
        </TabsContent>

        {/* CHAT */}
        <TabsContent value="chat" className="space-y-3">
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-foreground text-sm">{T(lang, "Student Chat", "மாணவர் Chat")}</h3>
              {chatStudent && (
                <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  {chatStudent.full_name}
                </span>
              )}
            </div>
            <div className="flex h-[480px]">
              {/* Student list sidebar */}
              <div className="w-48 sm:w-56 border-r border-border/40 overflow-y-auto shrink-0">
                {students.length === 0 && (
                  <p className="text-center text-muted-foreground text-xs py-8">{T(lang,"No students","மாணவர் இல்லை")}</p>
                )}
                {[...students].sort((a, b) => {
                  const ua = unreadMap[a.id] ?? 0, ub = unreadMap[b.id] ?? 0;
                  if (ua !== ub) return ub - ua;
                  return (lastMsgMap[b.id] ?? 0) - (lastMsgMap[a.id] ?? 0);
                }).map(s => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setChatStudent(s);
                      setUnreadMap(prev => ({ ...prev, [s.id]: 0 }));
                    }}
                    className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 hover:bg-secondary/60 transition-colors border-b border-border/30 ${chatStudent?.id === s.id ? "bg-primary/10 border-l-2 border-l-primary" : ""}`}
                  >
                    <div className="relative w-8 h-8 shrink-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-white">{s.full_name.charAt(0).toUpperCase()}</span>
                      </div>
                      {(unreadMap[s.id] ?? 0) > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center shadow">
                          {(unreadMap[s.id] ?? 0) > 9 ? "9+" : unreadMap[s.id]}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-medium truncate ${(unreadMap[s.id] ?? 0) > 0 ? "font-bold text-foreground" : ""}`}>{s.full_name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {lastMsgMap[s.id] ? new Date(lastMsgMap[s.id]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : s.auto_id}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
              {/* Chat panel */}
              <div className="flex-1 min-w-0">
                {chatStudent && adminUserId ? (
                  <ChatWindow
                    studentId={chatStudent.id}
                    studentName={chatStudent.full_name}
                    role="admin"
                    userId={adminUserId}
                    lang={lang}
                    onUnreadChange={handleUnreadChange}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                    <MessageCircle className="w-12 h-12 opacity-15" />
                    <p className="text-sm">{T(lang,"Select a student to chat","மாணவரை தேர்வு செய்யுங்கள்")}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* My Paid Students Dialog */}
      <Dialog open={showMyPaid} onOpenChange={setShowMyPaid}>
        <DialogContent className="glass-card border-border w-[calc(100vw-2rem)] max-w-sm max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <span>👤</span> {T(lang, "Your Paid Students", "நீங்கள் Paid பண்ணியவர்கள்")}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 divide-y divide-border/40 mt-2">
            {students.filter(s => (s as any).payment_marked_by === adminEmail && s.payment_status === "paid").length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">{T(lang, "No paid students yet", "இன்னும் யாரும் paid பண்ணல")}</p>
            ) : (
              students.filter(s => (s as any).payment_marked_by === adminEmail && s.payment_status === "paid").map((s, i) => (
                <div key={s.id} className="flex items-center gap-3 py-2.5 px-1">
                  <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}.</span>
                  <div className="w-7 h-7 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-emerald-600">{s.full_name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{s.full_name}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">{s.auto_id}</p>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">✓ Paid</span>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialogs */}
      <AlertDialog open={!!confirmPayment} onOpenChange={o => { if (!o) setConfirmPayment(null); }}>
        <AlertDialogContent className="glass-card border-border w-[calc(100vw-2rem)] max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">{T(lang,"Change Payment Status?","கட்டண நிலை மாத்தவா?")}</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              <span className="font-semibold text-foreground">{confirmPayment?.student.full_name}</span> →{" "}
              <span className={`font-semibold ${confirmPayment?.status === "paid" ? "text-emerald-500" : confirmPayment?.status === "late" ? "text-amber-500" : "text-destructive"}`}>
                {confirmPayment?.status?.toUpperCase()}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2">
            <AlertDialogCancel className="flex-1">{T(lang,"Cancel","ரத்து")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { handlePaymentUpdate(confirmPayment!.student, confirmPayment!.status); setConfirmPayment(null); }}
              className="flex-1 gradient-primary text-primary-foreground">{T(lang,"Confirm","உறுதிப்படுத்து")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmEdit} onOpenChange={o => { if (!o) setConfirmEdit(null); }}>
        <AlertDialogContent className="glass-card border-border w-[calc(100vw-2rem)] max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">{T(lang,"Edit Student?","மாணவரை திருத்தவா?")}</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">{confirmEdit?.full_name}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2">
            <AlertDialogCancel className="flex-1">{T(lang,"Cancel","ரத்து")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setEditStudent(confirmEdit); setConfirmEdit(null); }} className="flex-1 gradient-primary text-primary-foreground">{T(lang,"Edit","திருத்து")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmBlock} onOpenChange={o => { if (!o) setConfirmBlock(null); }}>
        <AlertDialogContent className="glass-card border-border w-[calc(100vw-2rem)] max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">
              {confirmBlock?.account_status === "active" ? T(lang,"Block Student?","மாணவரை தடுக்கவா?") : T(lang,"Unblock Student?","தடையை நீக்கவா?")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">{confirmBlock?.full_name}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2">
            <AlertDialogCancel className="flex-1">{T(lang,"Cancel","ரத்து")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { onToggleBlock(confirmBlock!.id); setConfirmBlock(null); }}
              className={`flex-1 ${confirmBlock?.account_status === "active" ? "bg-amber-500 text-white" : "bg-emerald-500 text-white"}`}>
              {confirmBlock?.account_status === "active" ? T(lang,"Block","தடு") : T(lang,"Unblock","தடை நீக்கு")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={o => { if (!o) setConfirmDelete(null); }}>
        <AlertDialogContent className="glass-card border-border w-[calc(100vw-2rem)] max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">{T(lang,"Delete Student?","மாணவரை நீக்கவா?")}</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">{confirmDelete?.full_name} — {T(lang,"Cannot be undone!","மீட்டெடுக்க முடியாது!")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2">
            <AlertDialogCancel className="flex-1">{T(lang,"Cancel","ரத்து")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { onDeleteStudent(confirmDelete!.id); setConfirmDelete(null); }} className="flex-1 bg-destructive text-destructive-foreground">
              {T(lang,"Delete","நீக்கு")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditStudentDialog student={editStudent} open={!!editStudent} onOpenChange={open => { if (!open) setEditStudent(null); }} onSave={onUpdateStudent} />
    </div>
  );
}
