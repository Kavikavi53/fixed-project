import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users, DollarSign, AlertTriangle, CheckCircle, Search,
  Plus, Trash2, ShieldAlert, ShieldCheck, Megaphone, ClipboardList, Pencil, FileDown,
  FileText, Upload, X,
} from "lucide-react";
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
}

export default function AdminDashboard({
  students, announcements, audit, loading, paymentHistory,
  onUpdatePayment, onDeleteStudent, onToggleBlock,
  onAddAnnouncement, onDeleteAnnouncement, onAddStudent, onUpdateStudent,
}: Props) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState<string>("all");
  const [streamFilter, setStreamFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [annTitle, setAnnTitle] = useState("");
  const [annMsg, setAnnMsg] = useState("");
  const [annUrgent, setAnnUrgent] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [newStudent, setNewStudent] = useState({
    full_name: "", address: "", dob: "", nic: "", email: "",
    school_id: "", batch: "2026" as Batch, stream: "Mathematics" as Stream,
    student_phone: "", parent_name: "", parent_phone: "",
  });

  // Get current admin email
  useState(() => {
    supabase.auth.getUser().then(({ data }) => setAdminEmail(data.user?.email ?? null));
  });

  const filtered = useMemo(() => {
    return students.filter(s => {
      if (search && !s.full_name.toLowerCase().includes(search.toLowerCase()) && !s.auto_id.toLowerCase().includes(search.toLowerCase())) return false;
      if (batchFilter !== "all" && s.batch !== batchFilter) return false;
      if (streamFilter !== "all" && s.stream !== streamFilter) return false;
      if (statusFilter !== "all" && s.payment_status !== statusFilter) return false;
      return true;
    });
  }, [students, search, batchFilter, streamFilter, statusFilter]);

  const stats = useMemo(() => {
    const paid = students.filter(s => s.payment_status === "paid").length;
    const pending = students.filter(s => s.payment_status === "pending").length;
    const late = students.filter(s => s.payment_status === "late").length;
    return { total: students.length, paid, pending, late, income: paid * 530 };
  }, [students]);

  // Your stats — payments marked by this admin
  const yourStats = useMemo(() => {
    const myStudents = students.filter(s => (s as any).payment_marked_by === adminEmail && s.payment_status === "paid");
    return { paid: myStudents.length, income: myStudents.length * 530 };
  }, [students, adminEmail]);

  const [addError, setAddError] = useState("");
  const [addLetterFile, setAddLetterFile] = useState<File | null>(null);
  const isAddLetterRequired = newStudent.batch === "2028" || newStudent.batch === "2029";

  // Confirmation states
  const [confirmDelete, setConfirmDelete] = useState<Student | null>(null);
  const [confirmBlock, setConfirmBlock] = useState<Student | null>(null);
  const [confirmEdit, setConfirmEdit] = useState<Student | null>(null);
  const [confirmPayment, setConfirmPayment] = useState<{ student: Student; status: PaymentStatus } | null>(null);

  const handleAddStudent = async () => {
    if (!newStudent.full_name.trim()) { setAddError("Full name is required"); return; }
    if (!newStudent.student_phone.trim()) { setAddError("Student phone is required"); return; }
    if (!newStudent.nic.trim()) { setAddError("NIC is required"); return; }
    if (!newStudent.dob.trim()) { setAddError("Date of Birth is required"); return; }
    if (!newStudent.address.trim()) { setAddError("Address is required"); return; }
    if (!newStudent.school_id.trim()) { setAddError("School ID is required"); return; }
    if (!newStudent.email.trim()) { setAddError("Email is required"); return; }
    if (!newStudent.parent_name.trim()) { setAddError("Parent name is required"); return; }
    if (!newStudent.parent_phone.trim()) { setAddError("Parent phone is required"); return; }
    if (isAddLetterRequired && !addLetterFile) { setAddError("Permission letter is required for 2028/2029 batch"); return; }
    setAddError("");

    // Check if email already exists
    const { data: existing, error: checkError } = await supabase
      .from("students")
      .select("id")
      .ilike("email", newStudent.email.trim())
      .maybeSingle();

    if (checkError) { setAddError("Error checking email. Try again."); return; }
    if (existing) { setAddError("இந்த email already registered ஆச்சு!"); return; }

    const result = await onAddStudent(newStudent);

    if (result?.error) {
      if (result.error.message?.includes("duplicate") || result.error.message?.includes("unique")) {
        setAddError("இந்த email already registered ஆச்சு!");
      } else {
        setAddError("Student add பண்ண முடியல: " + result.error.message);
      }
      return;
    }

    const studentId = result?.data?.id;

    // Upload letter if provided
    if (addLetterFile && studentId) {
      const ext = addLetterFile.name.split(".").pop();
      const fileName = `admin_${studentId}_permission_letter.${ext}`;
      const { data: uploadData } = await supabase.storage
        .from("permission-letters")
        .upload(fileName, addLetterFile, { upsert: true });
      if (uploadData) {
        await supabase.from("students").update({ permission_letter_url: uploadData.path }).eq("id", studentId);
      }
    }

    setAddOpen(false);
    setAddLetterFile(null);
    setNewStudent({ full_name: "", address: "", dob: "", nic: "", email: "", school_id: "", batch: "2026", stream: "Mathematics", student_phone: "", parent_name: "", parent_phone: "" });
  };

  const handleAddAnnouncement = async () => {
    if (!annTitle || !annMsg) return;
    await onAddAnnouncement(annTitle, annMsg, annUrgent);
    setAnnTitle(""); setAnnMsg(""); setAnnUrgent(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-7xl">

      {/* Month + Clock header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-xl px-5 py-3 flex items-center justify-between border border-primary/20">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Current Month</p>
          <p className="text-base font-bold text-foreground">
            {new Date().toLocaleString("en-IN", { month: "long", year: "numeric" })}
          </p>
        </div>
        <LiveClock />
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatsCard title="Total Students" value={stats.total} icon={Users} delay={0} />
        <StatsCard title="Paid" value={stats.paid} icon={CheckCircle} variant="success" delay={0.05} />
        <StatsCard title="Pending" value={stats.pending} icon={AlertTriangle} variant="destructive" delay={0.1} />
        <StatsCard title="Late" value={stats.late} icon={AlertTriangle} variant="warning" delay={0.15} />
        <StatsCard title="Income" value={`Rs. ${stats.income.toLocaleString()}`} icon={DollarSign} delay={0.2} />

        {/* Your Collections */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="col-span-2 glass-card rounded-xl px-5 py-3 flex items-center gap-3 border border-primary/20">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-base">👤</div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Your Collections {adminEmail && <span className="normal-case ml-1 text-primary">— {adminEmail}</span>}
            </p>
            <p className="text-sm font-semibold text-foreground mt-0.5">
              Paid: <span className="text-green-500">{yourStats.paid}</span>
              <span className="mx-2 text-muted-foreground">|</span>
              Income: <span className="text-primary">Rs. {yourStats.income.toLocaleString()}</span>
            </p>
          </div>
        </motion.div>
      </div>

      <Tabs defaultValue="students" className="space-y-4">
        <TabsList className="glass-card border-border/50">
          <TabsTrigger value="students" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Students</TabsTrigger>
          <TabsTrigger value="announcements" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Announcements</TabsTrigger>
          <TabsTrigger value="reports" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><FileDown className="w-3.5 h-3.5 mr-1" />Reports</TabsTrigger>
          <TabsTrigger value="audit" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search name or ID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-secondary" />
            </div>
            <Select value={batchFilter} onValueChange={setBatchFilter}>
              <SelectTrigger className="w-full sm:w-32 bg-secondary"><SelectValue placeholder="Batch" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Batches</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2027">2027</SelectItem>
                <SelectItem value="2028">2028</SelectItem>
                <SelectItem value="2029">2029</SelectItem>
              </SelectContent>
            </Select>
            <Select value={streamFilter} onValueChange={setStreamFilter}>
              <SelectTrigger className="w-full sm:w-40 bg-secondary"><SelectValue placeholder="Stream" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Streams</SelectItem>
                <SelectItem value="Mathematics">Mathematics</SelectItem>
                <SelectItem value="Bio Science">Bio Science</SelectItem>
                <SelectItem value="Commerce">Commerce</SelectItem>
                <SelectItem value="Arts">Arts</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-36 bg-secondary"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="late">Late</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary text-primary-foreground"><Plus className="w-4 h-4 mr-1" /> Add</Button>
              </DialogTrigger>
              <DialogContent className="glass-card border-border max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Add New Student</DialogTitle></DialogHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input placeholder="Full Name *" value={newStudent.full_name} onChange={e => { setNewStudent(p => ({ ...p, full_name: e.target.value })); setAddError(""); }} className="bg-secondary" />
                  <Input placeholder="School ID *" value={newStudent.school_id} onChange={e => { setNewStudent(p => ({ ...p, school_id: e.target.value })); setAddError(""); }} className="bg-secondary" />
                  <Input placeholder="NIC *" value={newStudent.nic} onChange={e => { setNewStudent(p => ({ ...p, nic: e.target.value })); setAddError(""); }} className="bg-secondary" />
                  <Input placeholder="Email *" type="email" value={newStudent.email} onChange={e => { setNewStudent(p => ({ ...p, email: e.target.value })); setAddError(""); }} className="bg-secondary" />
                  <Input placeholder="DOB *" type="date" value={newStudent.dob} onChange={e => { setNewStudent(p => ({ ...p, dob: e.target.value })); setAddError(""); }} className="bg-secondary" />
                  <Input placeholder="Address *" value={newStudent.address} onChange={e => { setNewStudent(p => ({ ...p, address: e.target.value })); setAddError(""); }} className="bg-secondary" />
                  <Input placeholder="Student Phone *" value={newStudent.student_phone} onChange={e => { setNewStudent(p => ({ ...p, student_phone: e.target.value })); setAddError(""); }} className="bg-secondary" />
                  <Input placeholder="Parent Name *" value={newStudent.parent_name} onChange={e => { setNewStudent(p => ({ ...p, parent_name: e.target.value })); setAddError(""); }} className="bg-secondary" />
                  <Input placeholder="Parent Phone *" value={newStudent.parent_phone} onChange={e => { setNewStudent(p => ({ ...p, parent_phone: e.target.value })); setAddError(""); }} className="bg-secondary" />
                  <Select value={newStudent.batch} onValueChange={v => setNewStudent(p => ({ ...p, batch: v as Batch }))}>
                    <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2026">2026</SelectItem>
                      <SelectItem value="2027">2027</SelectItem>
                      <SelectItem value="2028">2028</SelectItem>
                      <SelectItem value="2029">2029</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={newStudent.stream} onValueChange={v => setNewStudent(p => ({ ...p, stream: v as Stream }))}>
                    <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mathematics">Mathematics</SelectItem>
                      <SelectItem value="Bio Science">Bio Science</SelectItem>
                      <SelectItem value="Commerce">Commerce</SelectItem>
                      <SelectItem value="Arts">Arts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Permission Letter Upload */}
                <div className={`mt-2 rounded-xl border-2 border-dashed p-4 text-center space-y-2 ${isAddLetterRequired ? "border-primary/50" : "border-border"}`}>
                  <div className="flex items-center gap-2 justify-center">
                    <FileText className="w-4 h-4 text-primary" />
                    <p className="text-sm font-medium text-foreground">
                      Permission Letter {isAddLetterRequired ? <span className="text-destructive">*</span> : <span className="text-xs text-muted-foreground">(Optional)</span>}
                    </p>
                  </div>
                  {addLetterFile ? (
                    <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2 text-sm">
                      <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="flex-1 truncate text-foreground text-left">{addLetterFile.name}</span>
                      <button type="button" onClick={() => setAddLetterFile(null)} className="text-muted-foreground hover:text-destructive">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) { setAddLetterFile(f); setAddError(""); } }} />
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium transition-colors">
                        <Upload className="w-4 h-4" /> Choose File
                      </div>
                    </label>
                  )}
                </div>

                {addError && <p className="text-sm text-destructive mt-1">{addError}</p>}
                <Button onClick={handleAddStudent} className="w-full gradient-primary text-primary-foreground mt-2">Add Student</Button>
              </DialogContent>
            </Dialog>
          </div>

          <div className="glass-card rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="text-left p-3 font-semibold text-muted-foreground text-xs uppercase">ID</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground text-xs uppercase">Name</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground text-xs uppercase hidden md:table-cell">Batch</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground text-xs uppercase hidden md:table-cell">Stream</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground text-xs uppercase">Payment</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground text-xs uppercase hidden lg:table-cell">Status</th>
                    <th className="text-right p-3 font-semibold text-muted-foreground text-xs uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, i) => (
                    <motion.tr
                      key={s.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                    >
                      <td className="p-3 font-mono text-xs text-muted-foreground">{s.auto_id}</td>
                      <td className="p-3 cursor-pointer hover:text-primary transition-colors" onClick={() => navigate(`/student/${s.id}`)}>
                        <div className="flex items-center gap-2">
                          <StudentAvatar name={s.full_name} photoUrl={s.profile_photo_url} studentId={s.id} canUpload={false} size="sm" />
                          <span className="font-medium text-foreground">{s.full_name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground hidden md:table-cell">{s.batch}</td>
                      <td className="p-3 text-muted-foreground hidden md:table-cell">{s.stream}</td>
                      <td className="p-3"><StatusBadge status={s.payment_status} /></td>
                      <td className="p-3 hidden lg:table-cell">
                        <span className={`text-xs font-medium ${s.account_status === "active" ? "text-success" : "text-destructive"}`}>
                          {s.account_status}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-1">
                          <Select value={s.payment_status} onValueChange={v => setConfirmPayment({ student: s, status: v as PaymentStatus })}>
                            <SelectTrigger className="h-7 w-20 text-xs bg-secondary"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="paid">Paid</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="late">Late</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setConfirmEdit(s)}>
                            <Pencil className="w-3.5 h-3.5 text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setConfirmBlock(s)}>
                            {s.account_status === "active" ? <ShieldAlert className="w-3.5 h-3.5 text-warning" /> : <ShieldCheck className="w-3.5 h-3.5 text-success" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setConfirmDelete(s)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">No students found</div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="announcements" className="space-y-4">
          <div className="glass-card rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2"><Megaphone className="w-4 h-4 text-primary" /> New Announcement</h3>
            <Input placeholder="Title" value={annTitle} onChange={e => setAnnTitle(e.target.value)} className="bg-secondary" />
            <Textarea placeholder="Message" value={annMsg} onChange={e => setAnnMsg(e.target.value)} className="bg-secondary" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch checked={annUrgent} onCheckedChange={setAnnUrgent} />
                <Label className="text-sm text-muted-foreground">Urgent Alert</Label>
              </div>
              <Button onClick={handleAddAnnouncement} className="gradient-primary text-primary-foreground">Post</Button>
            </div>
          </div>
          <div className="space-y-3">
            {announcements.map(a => (
              <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`glass-card rounded-xl p-4 ${a.urgent ? "border-warning/50 border-l-4" : ""}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-foreground">{a.title}{a.urgent && <span className="ml-2 text-xs text-warning font-bold">URGENT</span>}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{a.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">{new Date(a.created_at).toLocaleString()}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => onDeleteAnnouncement(a.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
            {announcements.length === 0 && <p className="text-center text-muted-foreground py-8">No announcements yet</p>}
          </div>
        </TabsContent>

        <TabsContent value="reports">
          <ReportsTab students={students} paymentHistory={paymentHistory} />
        </TabsContent>

        <TabsContent value="audit" className="space-y-3">
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-foreground">Audit Log</h3>
            </div>
            <div className="divide-y divide-border/50 max-h-96 overflow-y-auto">
              {audit.map(a => (
                <div key={a.id} className="p-3 flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-foreground font-medium">{a.action}</p>
                    <p className="text-muted-foreground text-xs">{a.details}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">{new Date(a.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
              {audit.length === 0 && <p className="text-center text-muted-foreground py-8">No actions recorded</p>}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Payment Confirmation */}
      <AlertDialog open={!!confirmPayment} onOpenChange={o => { if (!o) setConfirmPayment(null); }}>
        <AlertDialogContent className="glass-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Payment Status மாத்தவா?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold text-foreground">{confirmPayment?.student.full_name}</span> — payment status{" "}
              <span className={`font-semibold ${confirmPayment?.status === "paid" ? "text-green-500" : confirmPayment?.status === "late" ? "text-warning" : "text-destructive"}`}>
                {confirmPayment?.status?.toUpperCase()}
              </span> ஆக மாத்தவா?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { onUpdatePayment(confirmPayment!.student.id, confirmPayment!.status); setConfirmPayment(null); }}
              className="gradient-primary text-primary-foreground">
              OK, மாத்து
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Confirmation */}
      <AlertDialog open={!!confirmEdit} onOpenChange={o => { if (!o) setConfirmEdit(null); }}>
        <AlertDialogContent className="glass-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Student?</AlertDialogTitle>
            <AlertDialogDescription>{confirmEdit?.full_name} — details edit பண்ணவா?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setEditStudent(confirmEdit); setConfirmEdit(null); }} className="gradient-primary text-primary-foreground">Edit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block Confirmation */}
      <AlertDialog open={!!confirmBlock} onOpenChange={o => { if (!o) setConfirmBlock(null); }}>
        <AlertDialogContent className="glass-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmBlock?.account_status === "active" ? "Block Student?" : "Unblock Student?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmBlock?.full_name} — {confirmBlock?.account_status === "active" ? "இந்த student-ஐ block பண்ணவா? Dashboard access போகும்." : "இந்த student-ஐ unblock பண்ணவா?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { onToggleBlock(confirmBlock!.id); setConfirmBlock(null); }} className={confirmBlock?.account_status === "active" ? "bg-warning text-warning-foreground" : "bg-success text-success-foreground"}>
              {confirmBlock?.account_status === "active" ? "Block" : "Unblock"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!confirmDelete} onOpenChange={o => { if (!o) setConfirmDelete(null); }}>
        <AlertDialogContent className="glass-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student?</AlertDialogTitle>
            <AlertDialogDescription>{confirmDelete?.full_name} — இந்த student-ஐ permanently delete பண்ணவா? Undo முடியாது!</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { onDeleteStudent(confirmDelete!.id); setConfirmDelete(null); }} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditStudentDialog student={editStudent} open={!!editStudent} onOpenChange={open => { if (!open) setEditStudent(null); }} onSave={onUpdateStudent} />
    </div>
  );
}
