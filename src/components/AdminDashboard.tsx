import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users, DollarSign, AlertTriangle, CheckCircle, Search,
  Plus, Trash2, ShieldAlert, ShieldCheck, Megaphone, ClipboardList, Pencil, FileDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import StatusBadge from "./StatusBadge";
import EditStudentDialog from "./EditStudentDialog";
import StatsCard from "./StatsCard";
import ReportsTab from "./ReportsTab";
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
  const [newStudent, setNewStudent] = useState({
    full_name: "", address: "", dob: "", nic: "", email: "",
    school_id: "", batch: "2026" as Batch, stream: "Mathematics" as Stream,
    student_phone: "", parent_name: "", parent_phone: "",
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

  const handleAddStudent = async () => {
    if (!newStudent.full_name || !newStudent.student_phone) return;
    await onAddStudent(newStudent);
    setAddOpen(false);
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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatsCard title="Total Students" value={stats.total} icon={Users} delay={0} />
        <StatsCard title="Paid" value={stats.paid} icon={CheckCircle} variant="success" delay={0.05} />
        <StatsCard title="Pending" value={stats.pending} icon={AlertTriangle} variant="destructive" delay={0.1} />
        <StatsCard title="Late" value={stats.late} icon={AlertTriangle} variant="warning" delay={0.15} />
        <StatsCard title="Income" value={`Rs. ${stats.income.toLocaleString()}`} icon={DollarSign} delay={0.2} />
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
                  <Input placeholder="Full Name *" value={newStudent.full_name} onChange={e => setNewStudent(p => ({ ...p, full_name: e.target.value }))} className="bg-secondary" />
                  <Input placeholder="School ID" value={newStudent.school_id} onChange={e => setNewStudent(p => ({ ...p, school_id: e.target.value }))} className="bg-secondary" />
                  <Input placeholder="NIC" value={newStudent.nic} onChange={e => setNewStudent(p => ({ ...p, nic: e.target.value }))} className="bg-secondary" />
                  <Input placeholder="Email" type="email" value={newStudent.email} onChange={e => setNewStudent(p => ({ ...p, email: e.target.value }))} className="bg-secondary" />
                  <Input placeholder="DOB" type="date" value={newStudent.dob} onChange={e => setNewStudent(p => ({ ...p, dob: e.target.value }))} className="bg-secondary" />
                  <Input placeholder="Address" value={newStudent.address} onChange={e => setNewStudent(p => ({ ...p, address: e.target.value }))} className="bg-secondary" />
                  <Input placeholder="Student Phone *" value={newStudent.student_phone} onChange={e => setNewStudent(p => ({ ...p, student_phone: e.target.value }))} className="bg-secondary" />
                  <Input placeholder="Parent Name" value={newStudent.parent_name} onChange={e => setNewStudent(p => ({ ...p, parent_name: e.target.value }))} className="bg-secondary" />
                  <Input placeholder="Parent Phone" value={newStudent.parent_phone} onChange={e => setNewStudent(p => ({ ...p, parent_phone: e.target.value }))} className="bg-secondary" />
                  <Select value={newStudent.batch} onValueChange={v => setNewStudent(p => ({ ...p, batch: v as Batch }))}>
                    <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="2026">2026</SelectItem><SelectItem value="2027">2027</SelectItem></SelectContent>
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
                      <td className="p-3 font-medium text-foreground cursor-pointer hover:text-primary transition-colors" onClick={() => navigate(`/student/${s.id}`)}>{s.full_name}</td>
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
                          <Select value={s.payment_status} onValueChange={v => onUpdatePayment(s.id, v as PaymentStatus)}>
                            <SelectTrigger className="h-7 w-20 text-xs bg-secondary"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="paid">Paid</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="late">Late</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditStudent(s)}>
                            <Pencil className="w-3.5 h-3.5 text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onToggleBlock(s.id)}>
                            {s.account_status === "active" ? <ShieldAlert className="w-3.5 h-3.5 text-warning" /> : <ShieldCheck className="w-3.5 h-3.5 text-success" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDeleteStudent(s.id)}>
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
      <EditStudentDialog student={editStudent} open={!!editStudent} onOpenChange={open => { if (!open) setEditStudent(null); }} onSave={onUpdateStudent} />
    </div>
  );
}
