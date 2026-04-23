import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Student, Batch, Stream } from "@/lib/store";

interface Props {
  student: Student | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, updates: Partial<Student>) => Promise<void>;
}

export default function EditStudentDialog({ student, open, onOpenChange, onSave }: Props) {
  const [form, setForm] = useState({
    full_name: "", student_phone: "", parent_name: "", parent_phone: "",
    email: "", address: "", nic: "", school_id: "", dob: "",
    batch: "2026" as Batch, stream: "Mathematics" as Stream,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (student) {
      setForm({
        full_name: student.full_name, student_phone: student.student_phone,
        parent_name: student.parent_name || "", parent_phone: student.parent_phone || "",
        email: student.email || "", address: student.address || "",
        nic: student.nic || "", school_id: student.school_id || "",
        dob: student.dob || "", batch: student.batch as Batch, stream: student.stream as Stream,
      });
    }
  }, [student]);

  const handleSave = async () => {
    if (!student || !form.full_name || !form.student_phone) return;
    setSaving(true);
    await onSave(student.id, {
      full_name: form.full_name, student_phone: form.student_phone,
      parent_name: form.parent_name || null, parent_phone: form.parent_phone || null,
      email: form.email || null, address: form.address || null,
      nic: form.nic || null, school_id: form.school_id || null,
      dob: form.dob || null, batch: form.batch as any, stream: form.stream as any,
    });
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit Student</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input placeholder="Full Name *" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} className="bg-secondary" />
          <Input placeholder="Student Phone *" value={form.student_phone} onChange={e => setForm(p => ({ ...p, student_phone: e.target.value }))} className="bg-secondary" />
          <Input placeholder="Email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="bg-secondary" />
          <Input placeholder="NIC" value={form.nic} onChange={e => setForm(p => ({ ...p, nic: e.target.value }))} className="bg-secondary" />
          <Input placeholder="School ID" value={form.school_id} onChange={e => setForm(p => ({ ...p, school_id: e.target.value }))} className="bg-secondary" />
          <Input placeholder="DOB" type="date" value={form.dob} onChange={e => setForm(p => ({ ...p, dob: e.target.value }))} className="bg-secondary" />
          <Input placeholder="Address" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} className="bg-secondary col-span-full" />
          <Input placeholder="Parent Name" value={form.parent_name} onChange={e => setForm(p => ({ ...p, parent_name: e.target.value }))} className="bg-secondary" />
          <Input placeholder="Parent Phone" value={form.parent_phone} onChange={e => setForm(p => ({ ...p, parent_phone: e.target.value }))} className="bg-secondary" />
          <Select value={form.batch} onValueChange={v => setForm(p => ({ ...p, batch: v as Batch }))}>
            <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="2026">2026</SelectItem><SelectItem value="2027">2027</SelectItem></SelectContent>
          </Select>
          <Select value={form.stream} onValueChange={v => setForm(p => ({ ...p, stream: v as Stream }))}>
            <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Mathematics">Mathematics</SelectItem>
              <SelectItem value="Bio Science">Bio Science</SelectItem>
              <SelectItem value="Commerce">Commerce</SelectItem>
              <SelectItem value="Arts">Arts</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleSave} disabled={saving} className="w-full gradient-primary text-primary-foreground mt-2">
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
