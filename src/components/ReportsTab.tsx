import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { FileSpreadsheet, FileText, Filter } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "./StatusBadge";
import type { Student, PaymentHistory } from "@/lib/store";
import { toast } from "sonner";

interface Props {
  students: Student[];
  paymentHistory: PaymentHistory[];
}

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

function formatDob(dob: string | null): string {
  if (!dob) return "";
  return dob.replace(/-/g, ".");
}

function genderVal(g: string | null | undefined): string {
  if (g === "male") return "boy";
  if (g === "female") return "girl";
  return "";
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
      return { student: s, status, paidDate: payment?.paid_date ?? "-" };
    });
  }, [students, paymentHistory, month, batchFilter, streamFilter]);

  // ══════════════════════════════════════════════
  // EXCEL — exact இலங்கை போக்குவரத்து சபை format
  // ══════════════════════════════════════════════
  const handleExcel = () => {
    if (rows.length === 0) { toast.error("No students to export"); return; }

    const wb = XLSX.utils.book_new();
    const PAGE_SIZE = 25;
    const pages = Math.ceil(rows.length / PAGE_SIZE);

    // Cell style helpers
    const font = (sz = 11, bold = false) => ({ name: "Arial Unicode MS", sz, bold });
    const thin = { style: "thin" as const };
    const border = { top: thin, bottom: thin, left: thin, right: thin };
    const align = (h: string, wrap = true) => ({ horizontal: h, vertical: "center", wrapText: wrap });

    for (let page = 0; page < pages; page++) {
      const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

      // Build AOA (array of arrays) — 40 rows x 15 cols (A..O)
      // We'll use col index 0=A ... 14=O
      const NUM_ROWS = 40;
      const NUM_COLS = 15;
      const aoa: any[][] = Array.from({ length: NUM_ROWS }, () => Array(NUM_COLS).fill(""));

      // Helper: set cell by col letter + row (1-based)
      const C = (col: string, row: number) => {
        const colIdx = col.charCodeAt(0) - 65; // A=0
        return { r: row - 1, c: colIdx };
      };

      // ROW 3 — title
      aoa[2][3] = "இலங்கை போக்குவரத்து சபை - வடக்கு"; // D3
      aoa[2][13] = "படிவ இல 2"; // N3

      // ROW 4 — sub title
      aoa[3][4] = "பாடசாலை மாணவர்களுக்கான பருவ கால சீட்டு விண்ணப்ப படிவம்"; // E4

      // ROW 6 — school + road
      aoa[5][2] = "பெயர் :-கிளி/அக்கராயன் மகா வித்தியாலயம்"; // C6
      aoa[5][9] = "வழங்கும் சாலை : கிளிநொச்சி சாலை"; // J6

      // ROW 7 — address
      aoa[6][2] = "விலாசம் :-அக்கராயன்குளம், கிளிநொச்சி."; // C7

      // ROW 8 — grade + season
      aoa[7][2] = "வகுப்பு தரம் :-க.பொ.த உயர்தரம் 12,13"; // C8
      aoa[7][9] = "தவணை …............................இருந்து …....................................வரை"; // J8

      // ROW 10 — column headers
      aoa[9][2]  = "தொடர் இல";           // C10
      aoa[9][3]  = "மாணவர் பெயர்";       // D10
      aoa[9][4]  = "அடையாள அட்டை இலக்கம்"; // E10
      aoa[9][5]  = "Date of Birth";       // F10
      aoa[9][6]  = "ஆண் பெண்";           // G10
      aoa[9][7]  = "பயணம் செய்யுமிடம் இருந்து        வரை"; // H10
      aoa[9][9]  = "பாதை இல";            // J10
      aoa[9][10] = "மாணவர் ஒப்பம்";      // K10
      aoa[9][11] = "பெறுமதி";            // L10
      aoa[9][12] = "காரியாலய பாவிப்புக்கு மட்டும் வழங்கப்பட்ட மாதங்கள்"; // M10

      // ROWS 11-35 — student data
      for (let i = 0; i < PAGE_SIZE; i++) {
        const rowIdx = 10 + i; // 0-based, row 11 = index 10
        const serial = page * PAGE_SIZE + i + 1;
        aoa[rowIdx][2] = serial; // C

        if (i < pageRows.length) {
          const r = pageRows[i];
          const st = r.student as any;
          aoa[rowIdx][3]  = st.full_name;              // D
          aoa[rowIdx][4]  = st.nic ?? "";               // E
          aoa[rowIdx][5]  = formatDob(st.dob);          // F
          aoa[rowIdx][6]  = genderVal(st.gender);       // G
          aoa[rowIdx][7]  = "Kilinochchi";              // H
          aoa[rowIdx][8]  = "AMV";                      // I
          aoa[rowIdx][9]  = 803;                        // J
          aoa[rowIdx][10] = "";                         // K (signature)
          aoa[rowIdx][11] = "";                         // L (price)
          aoa[rowIdx][12] = monthLabel;                 // M (month - merged M:O)
        } else {
          aoa[rowIdx][7]  = "Kilinochchi";
          aoa[rowIdx][8]  = "AMV";
        }
      }

      // ROW 36-37 — footer text
      aoa[35][2] = "மேற்தரப்பட்ட மாணவர்கள் யாவரும் இப்பாடசாலையில் முழு நேர மாணவர்களாக கல்வி கற்பவர்கள் என்றும் மேலும் இவர்கள் பிற இடங்களில் பகுதிநேர வேலைக்கென அமர்த்தப்பட்டவர்கள் அல்ல என்றும் இவர்களுக்கு பருவ கால சீட்டு வழங்கலாம் என்றும் சிபாரிசு செய்கின்றேன்";

      // ROW 38
      aoa[37][2]  = "வகுப்பாசிரியர் பெயர்….........................";
      aoa[37][11] = "சீட்டு தயாரித்து வழங்கியவர்…...............";

      // ROW 39
      aoa[38][2]  = "வகுப்பாசிரியர் ஒப்பம்…........................";
      aoa[38][6]  = "பதிவாளர் ஒப்பம்…...................";
      aoa[38][9]  = "திகதி….....................";
      aoa[38][11] = "சீட்டு கொடுபட வேண்டிய திகதி…............";

      // ROW 40
      aoa[39][11] = "சாலை அதிபரின் ஒப்பம்...…….................";

      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(aoa);

      // Column widths
      ws["!cols"] = [
        { wch: 3 },    // A
        { wch: 3 },    // B
        { wch: 13 },   // C - தொடர்
        { wch: 25.7 }, // D - பெயர்
        { wch: 22.7 }, // E - NIC
        { wch: 17.9 }, // F - DOB
        { wch: 8 },    // G - ஆண் பெண்
        { wch: 12 },   // H - from
        { wch: 9.7 },  // I - AMV
        { wch: 8 },    // J - route
        { wch: 14.9 }, // K - signature
        { wch: 13 },   // L - price
        { wch: 13 },   // M - month
        { wch: 13 },   // N
        { wch: 13 },   // O
      ];

      // Row heights
      ws["!rows"] = Array.from({ length: 40 }, (_, i) => {
        if (i === 2 || i === 3) return { hpt: 18 };
        if (i === 9) return { hpt: 30 };
        if (i === 35) return { hpt: 28 };
        return { hpt: 15 };
      });

      // Merges — exact from original
      ws["!merges"] = [
        { s: { r: 2, c: 3 }, e: { r: 2, c: 8 } },   // D3:I3 - title
        { s: { r: 2, c: 13 }, e: { r: 3, c: 14 } },  // N3:O4 - படிவ இல 2
        { s: { r: 3, c: 4 }, e: { r: 3, c: 11 } },   // E4:L4 - subtitle
        { s: { r: 5, c: 2 }, e: { r: 5, c: 4 } },    // C6:E6 - school name
        { s: { r: 5, c: 9 }, e: { r: 5, c: 14 } },   // J6:O6 - road
        { s: { r: 6, c: 2 }, e: { r: 6, c: 4 } },    // C7:E7 - address
        { s: { r: 7, c: 2 }, e: { r: 7, c: 4 } },    // C8:E8 - grade
        { s: { r: 9, c: 7 }, e: { r: 9, c: 8 } },    // H10:I10 - from/to header
        { s: { r: 9, c: 12 }, e: { r: 9, c: 14 } },  // M10:O10 - month header
        { s: { r: 35, c: 2 }, e: { r: 36, c: 14 } }, // C36:O37 - footer text
        { s: { r: 37, c: 2 }, e: { r: 37, c: 3 } },  // C38:D38
        { s: { r: 37, c: 11 }, e: { r: 37, c: 14 } }, // L38:O38
        { s: { r: 38, c: 2 }, e: { r: 38, c: 3 } },  // C39:D39
        { s: { r: 38, c: 6 }, e: { r: 38, c: 8 } },  // G39:I39
        { s: { r: 38, c: 9 }, e: { r: 38, c: 10 } }, // J39:K39
        { s: { r: 38, c: 11 }, e: { r: 38, c: 14 } }, // L39:O39
        { s: { r: 39, c: 11 }, e: { r: 39, c: 14 } }, // L40:O40
        // Merge M:O for each data row (month column)
        ...Array.from({ length: PAGE_SIZE }, (_, i) => ({
          s: { r: 10 + i, c: 12 }, e: { r: 10 + i, c: 14 }
        })),
      ];

      // Apply styles using XLSX cell style format
      const styleHeader = { font: font(12, true), alignment: align("center") };
      const styleSubH  = { font: font(11, false), alignment: align("center") };
      const styleLabel = { font: font(11), alignment: align("left") };
      const styleColH  = { font: font(11), alignment: align("center"), border };
      const styleData  = { font: font(11), alignment: align("center"), border };
      const styleDataL = { font: font(11), alignment: align("left"), border };
      const styleFooter= { font: font(10), alignment: align("left", true) };

      // Title row styles
      ws["D3"] = { ...ws["D3"], s: styleHeader };
      ws["N3"] = { ...ws["N3"], s: styleSubH };
      ws["E4"] = { ...ws["E4"], s: styleSubH };
      ws["C6"] = { ...ws["C6"], s: styleLabel };
      ws["J6"] = { ...ws["J6"], s: styleLabel };
      ws["C7"] = { ...ws["C7"], s: styleLabel };
      ws["C8"] = { ...ws["C8"], s: styleLabel };
      ws["J8"] = { ...ws["J8"], s: styleLabel };

      // Column header styles
      for (const col of ["C","D","E","F","G","H","J","K","L","M"]) {
        const addr = `${col}10`;
        if (ws[addr]) ws[addr] = { ...ws[addr], s: styleColH };
      }

      // Data row styles
      for (let i = 0; i < PAGE_SIZE; i++) {
        const row = 11 + i;
        if (ws[`C${row}`]) ws[`C${row}`] = { ...ws[`C${row}`], s: styleData };
        if (ws[`D${row}`]) ws[`D${row}`] = { ...ws[`D${row}`], s: styleDataL };
        for (const col of ["E","F","G","H","I","J","K","L","M","N","O"]) {
          const addr = `${col}${row}`;
          if (!ws[addr]) ws[addr] = { t: "s", v: "", s: styleData };
          else ws[addr] = { ...ws[addr], s: styleData };
        }
      }

      // Footer styles
      ws["C36"] = { ...ws["C36"], s: styleFooter };
      for (const addr of ["C38","L38","C39","G39","J39","L39","L40"]) {
        if (ws[addr]) ws[addr] = { ...ws[addr], s: styleFooter };
      }

      const sheetName = pages > 1 ? `Page ${page + 1}` : "Report";
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }

    XLSX.writeFile(wb, `Season_Ticket_${month}.xlsx`);
    toast.success(`Excel downloaded — ${rows.length} students, ${pages} page(s)`);
  };

  // ══════════════════════════════════════════════
  // PDF — இலங்கை போக்குவரத்து சபை format
  // (English text only for PDF — Tamil shown as header info)
  // ══════════════════════════════════════════════
  const handlePDF = () => {
    if (rows.length === 0) { toast.error("No students to export"); return; }

    // Dynamic import to avoid SSR issues
    import("jspdf").then(({ default: jsPDF }) =>
      import("jspdf-autotable").then(({ default: autoTable }) => {
        const PAGE_SIZE = 25;
        const pages = Math.ceil(rows.length / PAGE_SIZE);
        const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

        for (let page = 0; page < pages; page++) {
          if (page > 0) doc.addPage("a4", "landscape");
          const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

          // ── HEADER BOX ──
          doc.setDrawColor(0);
          doc.setLineWidth(0.5);
          doc.rect(8, 5, 281, 32); // outer box

          doc.setFont("helvetica", "bold");
          doc.setFontSize(12);
          doc.text("SRI LANKA TRANSPORT BOARD - NORTH", 148, 12, { align: "center" });
          doc.text("(இலங்கை போக்குவரத்து சபை - வடக்கு)", 148, 18, { align: "center" });

          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.text("School Students Season Ticket Application Form", 148, 23, { align: "center" });
          doc.text("(பாடசாலை மாணவர்களுக்கான பருவ கால சீட்டு விண்ணப்ப படிவம்)", 148, 27, { align: "center" });

          doc.setFontSize(8);
          doc.text("Form No: 2  (படிவ இல 2)", 270, 12);

          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.text("School: Kili/Akkarayan Maha Vidiyalayam", 12, 34);
          doc.text("Road: Kilinochchi Road", 185, 34);

          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.text("Address: Akkarayankulam, Kilinochchi.", 12, 38.5);
          doc.text("Grade: G.C.E A/L - Grade 12,13", 12, 43);
          doc.text(`Season: ${monthLabel}`, 185, 43);

          // ── TABLE ──
          const tableBody = [];
          for (let i = 0; i < PAGE_SIZE; i++) {
            if (i < pageRows.length) {
              const r = pageRows[i];
              const st = r.student as any;
              tableBody.push([
                page * PAGE_SIZE + i + 1,
                st.full_name,
                st.nic ?? "",
                formatDob(st.dob),
                st.gender === "male" ? "Boy" : st.gender === "female" ? "Girl" : "",
                "Kilinochchi",
                "AMV",
                "803",
                "",   // signature
                "",   // price
                monthLabel,
              ]);
            } else {
              tableBody.push([page * PAGE_SIZE + i + 1, "", "", "", "", "Kilinochchi", "AMV", "", "", "", ""]);
            }
          }

          autoTable(doc, {
            startY: 46,
            head: [[
              "#",
              "Student Name\n(மாணவர் பெயர்)",
              "NIC\n(அடையாள அட்டை)",
              "Date of Birth\n(பிறந்த திகதி)",
              "Gender\n(ஆண்/பெண்)",
              "From\n(இருந்து)",
              "To\n(வரை)",
              "Route\n(பாதை)",
              "Signature\n(மாணவர் ஒப்பம்)",
              "Value\n(பெறுமதி)",
              "Month\n(மாதம்)",
            ]],
            body: tableBody,
            styles: {
              fontSize: 7,
              cellPadding: 1.5,
              minCellHeight: 5.5,
              font: "helvetica",
              valign: "middle",
              halign: "center",
              lineColor: [0, 0, 0],
              lineWidth: 0.25,
              textColor: [0, 0, 0],
              fillColor: [255, 255, 255],
            },
            headStyles: {
              fillColor: [220, 230, 250],
              textColor: [0, 0, 0],
              fontStyle: "bold",
              fontSize: 6.5,
              halign: "center",
              minCellHeight: 11,
            },
            alternateRowStyles: { fillColor: [248, 250, 255] },
            columnStyles: {
              0:  { cellWidth: 8,  halign: "center" },
              1:  { cellWidth: 42, halign: "left" },
              2:  { cellWidth: 28, halign: "center" },
              3:  { cellWidth: 18, halign: "center" },
              4:  { cellWidth: 12, halign: "center" },
              5:  { cellWidth: 20, halign: "center" },
              6:  { cellWidth: 13, halign: "center" },
              7:  { cellWidth: 10, halign: "center" },
              8:  { cellWidth: 30, halign: "center" },
              9:  { cellWidth: 13, halign: "center" },
              10: { cellWidth: 22, halign: "center" },
            },
            margin: { left: 8, right: 8 },
            tableLineColor: [0, 0, 0],
            tableLineWidth: 0.4,
          });

          const finalY = (doc as any).lastAutoTable.finalY + 4;

          // ── FOOTER ──
          doc.setFontSize(7.5);
          doc.setFont("helvetica", "normal");
          doc.text(
            "I hereby certify that the above students are full-time students of this school and are not employed part-time elsewhere, and recommend issuing them season tickets.",
            10, finalY, { maxWidth: 270 }
          );

          const sigY = finalY + 10;
          doc.setLineWidth(0.3);
          // Line boxes for signatures
          doc.text("Class Teacher Name: ................................", 10, sigY);
          doc.text("Issued by: .......................................", 175, sigY);
          doc.text("Class Teacher Signature: ........................", 10, sigY + 7);
          doc.text("Registrar Signature: ..................", 90, sigY + 7);
          doc.text("Date: ................", 175, sigY + 7);
          doc.text("Issue Date: .......................................", 175, sigY + 14);
          doc.text("Road Manager Signature: .....................................", 175, sigY + 21);

          // Page number
          doc.setFontSize(7);
          doc.setTextColor(100, 100, 100);
          doc.text(
            `Page ${page + 1} of ${pages}  |  ${monthLabel}  |  Total: ${rows.length} students  |  Bus Route: 803`,
            148, 207, { align: "center" }
          );
          doc.setTextColor(0, 0, 0);
        }

        doc.save(`Season_Ticket_${month}.pdf`);
        toast.success(`PDF downloaded — ${rows.length} students, ${pages} page(s)`);
      })
    );
  };

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-primary" />
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
          இலங்கை போக்குவரத்து சபை - வடக்கு official format — 25 students/page, ஆண்/பெண், signature rows.
        </p>
      </div>

      {/* Preview */}
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
                <th className="text-left p-3 text-xs uppercase text-muted-foreground hidden md:table-cell">Gender</th>
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
                  <td className="p-3 text-muted-foreground hidden md:table-cell">{formatDob(r.student.dob)}</td>
                  <td className="p-3 text-muted-foreground hidden md:table-cell">
                    {(r.student as any).gender === "male" ? "👦 ஆண்" : (r.student as any).gender === "female" ? "👧 பெண்" : "—"}
                  </td>
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
