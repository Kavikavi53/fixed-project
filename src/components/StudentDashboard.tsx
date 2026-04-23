import { motion } from "framer-motion";
import { User, Phone, MapPin, GraduationCap, Calendar, CreditCard, Megaphone } from "lucide-react";
import StatusBadge from "./StatusBadge";
import LiveClock from "./LiveClock";
import StudentAvatar from "./StudentAvatar";
import type { Student, Announcement, PaymentHistory } from "@/lib/store";

interface Props {
  student: Student;
  announcements: Announcement[];
  paymentHistory: PaymentHistory[];
}

export default function StudentDashboard({ student, announcements, paymentHistory }: Props) {
  const studentPayments = paymentHistory.filter(p => p.student_id === student.id);

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-3xl">
      {/* Live Clock - Top Right */}
      <div className="flex justify-end">
        <LiveClock />
      </div>

      {announcements.filter(a => a.urgent).map(a => (
        <motion.div key={a.id} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-4 border-l-4 border-warning/50">
          <p className="text-xs font-bold text-warning uppercase">⚠ Urgent</p>
          <p className="text-sm font-semibold text-foreground mt-1">{a.title}</p>
          <p className="text-xs text-muted-foreground mt-1">{a.message}</p>
        </motion.div>
      ))}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <StudentAvatar
            name={student.full_name}
            photoUrl={student.profile_photo_url}
            studentId={student.id}
            canUpload={true}
          />
          <div className="flex-1 text-center sm:text-left space-y-2">
            <h2 className="text-xl font-bold text-foreground">{student.full_name}</h2>
            <p className="text-sm font-mono text-primary">{student.auto_id}</p>
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              <span className="text-xs bg-secondary px-2 py-1 rounded-full text-secondary-foreground">{student.batch}</span>
              <span className="text-xs bg-secondary px-2 py-1 rounded-full text-secondary-foreground">{student.stream}</span>
              <StatusBadge status={student.payment_status} />
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-xl p-5">
        <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
          <CreditCard className="w-4 h-4 text-primary" /> Payment Status
        </h3>
        <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-secondary">
          <div>
            <p className="text-sm text-muted-foreground">Current Month Fee</p>
            <p className="text-lg font-bold text-foreground">Rs. 530.00</p>
          </div>
          <StatusBadge status={student.payment_status} />
        </div>
        {studentPayments.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase">History</p>
            {studentPayments.map(h => (
              <div key={h.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border/30 last:border-0">
                <span className="text-muted-foreground">{h.month}</span>
                <div className="flex items-center gap-2">
                  {h.paid_date && <span className="text-xs text-muted-foreground">{h.paid_date}</span>}
                  <StatusBadge status={h.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-xl p-5 space-y-3">
        <h3 className="font-semibold text-foreground mb-3">Personal Details</h3>
        {[
          { icon: User, label: "NIC", value: student.nic },
          { icon: Calendar, label: "DOB", value: student.dob },
          { icon: MapPin, label: "Address", value: student.address },
          { icon: Phone, label: "Phone", value: student.student_phone },
          { icon: User, label: "Parent", value: student.parent_name ? `${student.parent_name} (${student.parent_phone ?? ""})` : "-" },
          { icon: GraduationCap, label: "School ID", value: student.school_id },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3 text-sm">
            <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground w-20 flex-shrink-0">{label}</span>
            <span className="text-foreground">{value ?? "-"}</span>
          </div>
        ))}
      </motion.div>

      {announcements.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-primary" /> Announcements
          </h3>
          {announcements.map(a => (
            <div key={a.id} className={`p-3 rounded-lg bg-secondary text-sm ${a.urgent ? "border-l-2 border-warning" : ""}`}>
              <p className="font-medium text-foreground">{a.title}</p>
              <p className="text-muted-foreground text-xs mt-1">{a.message}</p>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
