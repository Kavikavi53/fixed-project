import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { FileSpreadsheet, FileText, Filter } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import StatusBadge from "./StatusBadge";
import type { Student, PaymentHistory } from "@/lib/store";
import { toast } from "sonner";

interface Props {
  students: Student[];
  paymentHistory: PaymentHistory[];
}

const SCHOOL_NAME = "A.M.V";
const BUS_ROUTE = "803";

function getMonthOptions() {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    opts.push({ value, label });
  }
  return opts;
}

export default function ReportsTab({ students, paymentHistory }: Props) {
  const monthOptions = useMemo(getMonthOptions, []);
  const [month, setMonth] = useState(monthOptions[0].value);
  const [batchFilter, setBatchFilter] = useState("all");
  const [streamFilter, setStreamFilter] = useState("all");

  const monthLabel = monthOptions.find(m => m.value === month)?.label ?? month;

  const rows = useMemo(() => {
    const filtered = students.filter(s => {
      if (batchFilter !== "all" && s.batch !== batchFilter) return false;
      if (streamFilter !== "all" && s.stream !== streamFilter) return false;
      return true;
    });
    return filtered.map(s => {
      const payment = paymentHistory.find(p => p.student_id === s.id && p.month === month);
      const status = payment?.status ?? s.payment_status;
      return {
        student: s,
        status,
        paidDate: payment?.paid_date ?? "-",
      };
    });
  }, [students, paymentHistory, month, batchFilter, streamFilter]);

  const handleExcel = () => {
    if (rows.length === 0) { toast.error("No students to export"); return; }
    const data = rows.map((r, i) => ({
      "#": i + 1,
      "Student Name": r.student.full_name,
      "Student ID": r.student.auto_id,
      "School": SCHOOL_NAME,
      "Bus Route": BUS_ROUTE,
      "DOB": r.student.dob ?? "-",
      "Batch": r.student.batch,
      "Stream": r.student.stream,
      "Payment Status": r.status.toUpperCase(),
      "Paid Date": r.paidDate,
      "Signature": "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [
      { wch: 4 }, { wch: 25 }, { wch: 18 }, { wch: 10 }, { wch: 10 },
      { wch: 12 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 18 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, monthLabel);
    XLSX.writeFile(wb, `Payment_Report_${month}.xlsx`);
    toast.success("Excel downloaded");
  };

  const handlePDF = () => {
    if (rows.length === 0) { toast.error("No students to export"); return; }
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text(`${SCHOOL_NAME} - Payment Report`, 14, 14);
    doc.setFontSize(10);
    doc.text(`Month: ${monthLabel}  |  Bus Route: ${BUS_ROUTE}  |  Total: ${rows.length}`, 14, 21);

    autoTable(doc, {
      startY: 26,
      head: [["#", "Student Name", "ID", "School", "Bus", "DOB", "Batch/Stream", "Status", "Paid Date", "Signature"]],
      body: rows.map((r, i) => [
        i + 1,
        r.student.full_name,
        r.student.auto_id,
        SCHOOL_NAME,
        BUS_ROUTE,
        r.student.dob ?? "-",
        `${r.student.batch} ${r.student.stream}`,
        r.status.toUpperCase(),
        r.paidDate,
        "",
      ]),
      styles: { fontSize: 8, cellPadding: 3, minCellHeight: 10 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      columnStyles: { 9: { cellWidth: 35 } },
      didDrawCell: (data) => {
        if (data.section === "body" && data.column.index === 9) {
          doc.setDrawColor(150);
          doc.rect(data.cell.x + 2, data.cell.y + 2, data.cell.width - 4, data.cell.height - 4);
        }
      },
    });

    doc.save(`Payment_Report_${month}.pdf`);
    toast.success("PDF downloaded");
  };

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">Monthly Payment Report</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Month</label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
              <SelectContent>
                {monthOptions.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Batch</label>
            <Select value={batchFilter} onValueChange={setBatchFilter}>
              <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Batches</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2027">2027</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Stream</label>
            <Select value={streamFilter} onValueChange={setStreamFilter}>
              <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Streams</SelectItem>
                <SelectItem value="Mathematics">Mathematics</SelectItem>
                <SelectItem value="Bio Science">Bio Science</SelectItem>
                <SelectItem value="Commerce">Commerce</SelectItem>
                <SelectItem value="Arts">Arts</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button onClick={handleExcel} className="gradient-primary text-primary-foreground">
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Download Excel
          </Button>
          <Button onClick={handlePDF} variant="outline">
            <FileText className="w-4 h-4 mr-2" /> Download PDF
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Report includes: Student name, School ({SCHOOL_NAME}), Bus route ({BUS_ROUTE}), DOB, Batch/Stream, Payment status, and a blank signature box.
        </p>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h4 className="font-semibold text-foreground text-sm">Preview — {monthLabel}</h4>
          <span className="text-xs text-muted-foreground">{rows.length} students</span>
        </div>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 sticky top-0">
              <tr className="border-b border-border">
                <th className="text-left p-3 text-xs uppercase text-muted-foreground">#</th>
                <th className="text-left p-3 text-xs uppercase text-muted-foreground">Name</th>
                <th className="text-left p-3 text-xs uppercase text-muted-foreground">ID</th>
                <th className="text-left p-3 text-xs uppercase text-muted-foreground hidden md:table-cell">DOB</th>
                <th className="text-left p-3 text-xs uppercase text-muted-foreground hidden md:table-cell">Batch/Stream</th>
                <th className="text-left p-3 text-xs uppercase text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <motion.tr key={r.student.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.01 }} className="border-b border-border/50">
                  <td className="p-3 text-muted-foreground">{i + 1}</td>
                  <td className="p-3 text-foreground font-medium">{r.student.full_name}</td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">{r.student.auto_id}</td>
                  <td className="p-3 text-muted-foreground hidden md:table-cell">{r.student.dob ?? "-"}</td>
                  <td className="p-3 text-muted-foreground hidden md:table-cell">{r.student.batch} {r.student.stream}</td>
                  <td className="p-3"><StatusBadge status={r.status} /></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="text-center text-muted-foreground py-8">No students match filters</p>}
        </div>
      </div>
    </div>
  );
}
