import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft, User, Phone, MapPin, GraduationCap, Calendar,
  CreditCard, Trash2, CheckCircle, Mail, IdCard,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import StatusBadge from "@/components/StatusBadge";
import type { Student, PaymentHistory, PaymentStatus } from "@/lib/store";
import { toast } from "sonner";

export default function StudentProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [payments, setPayments] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStudent = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase.from("students").select("*").eq("id", id).single();
    if (data) setStudent(data);
    const { data: payData } = await supabase
      .from("payment_history").select("*").eq("student_id", id)
      .order("created_at", { ascending: false });
    if (payData) setPayments(payData);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchStudent();

    const channel = supabase
      .channel(`student-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "students", filter: `id=eq.${id}` }, () => {
        supabase.from("students").select("*").eq("id", id!).single().then(r => { if (r.data) setStudent(r.data); });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_history", filter: `student_id=eq.${id}` }, () => {
        supabase.from("payment_history").select("*").eq("student_id", id!).order("created_at", { ascending: false }).then(r => { if (r.data) setPayments(r.data); });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, fetchStudent]);

  const handleMarkPaid = async () => {
    if (!student) return;
    await supabase.from("students").update({ payment_status: "paid" as PaymentStatus }).eq("id", student.id);
    toast.success("Marked as paid");
  };

  const handleDelete = async () => {
    if (!student) return;
    await supabase.from("students").delete().eq("id", student.id);
    toast.success("Student deleted");
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Student not found.</p>
        <Button variant="outline" onClick={() => navigate("/")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      </div>
    );
  }

  const details = [
    { icon: IdCard, label: "NIC", value: student.nic },
    { icon: Calendar, label: "DOB", value: student.dob },
    { icon: Mail, label: "Email", value: student.email },
    { icon: MapPin, label: "Address", value: student.address },
    { icon: Phone, label: "Phone", value: student.student_phone },
    { icon: User, label: "Parent", value: student.parent_name ? `${student.parent_name} (${student.parent_phone ?? ""})` : null },
    { icon: GraduationCap, label: "School ID", value: student.school_id },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-3xl space-y-6">
        {/* Back button */}
        <Button variant="ghost" onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Students
        </Button>

        {/* Profile card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="flex flex-col items-center gap-3">
              <div className="w-24 h-24 rounded-2xl gradient-primary flex items-center justify-center text-primary-foreground text-3xl font-bold">
                {student.full_name.charAt(0)}
              </div>
              <QRCodeSVG value={student.auto_id} size={90} bgColor="transparent" fgColor="hsl(var(--foreground))" />
            </div>
            <div className="flex-1 text-center sm:text-left space-y-2">
              <h1 className="text-2xl font-bold text-foreground">{student.full_name}</h1>
              <p className="text-sm font-mono text-primary">{student.auto_id}</p>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <span className="text-xs bg-secondary px-2.5 py-1 rounded-full text-secondary-foreground">{student.batch}</span>
                <span className="text-xs bg-secondary px-2.5 py-1 rounded-full text-secondary-foreground">{student.stream}</span>
                <StatusBadge status={student.payment_status} />
              </div>
              <p className="text-xs text-muted-foreground">
                Account: <span className={student.account_status === "active" ? "text-success" : "text-destructive"}>{student.account_status}</span>
              </p>
            </div>
          </div>
        </motion.div>

        {/* Payment section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-xl p-5">
          <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
            <CreditCard className="w-4 h-4 text-primary" /> Payment Status
          </h3>
          <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-secondary">
            <div>
              <p className="text-sm text-muted-foreground">Monthly Fee</p>
              <p className="text-lg font-bold text-foreground">Rs. 530.00</p>
            </div>
            <StatusBadge status={student.payment_status} />
          </div>

          {student.payment_status !== "paid" && (
            <Button onClick={handleMarkPaid} className="w-full gradient-primary text-primary-foreground mb-4">
              <CheckCircle className="w-4 h-4 mr-2" /> Mark as Paid
            </Button>
          )}

          {payments.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Payment History</p>
              {payments.map(h => (
                <div key={h.id} className="flex items-center justify-between text-sm py-2 border-b border-border/30 last:border-0">
                  <span className="text-muted-foreground">{h.month}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">Rs. {h.amount}</span>
                    {h.paid_date && <span className="text-xs text-muted-foreground">{h.paid_date}</span>}
                    <StatusBadge status={h.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Personal details */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-foreground mb-3">Personal Details</h3>
          {details.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 text-sm">
              <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground w-20 flex-shrink-0">{label}</span>
              <span className="text-foreground">{value ?? "-"}</span>
            </div>
          ))}
        </motion.div>

        {/* Delete */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                <Trash2 className="w-4 h-4 mr-2" /> Delete Student
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="glass-card border-border">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {student.full_name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. All data for this student will be permanently removed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </motion.div>
      </div>
    </div>
  );
}
