import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { FileSpreadsheet, FileText, Filter } from "lucide-react";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "./StatusBadge";
import type { Student, PaymentHistory } from "@/lib/store";
import { toast } from "sonner";
import templateUrl from "@/assets/season_template.xlsx?url";

interface Props {
  students: Student[];
  paymentHistory: PaymentHistory[];
}

const DEFAULT_FROM = "Kilinochchi";
const DEFAULT_TO = "AMV";
const DEFAULT_ROUTE = 803;

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

function genderLabel(s: Student): string {
  // Try infer from any available hint; default blank
  const anyS = s as any;
  const g = (anyS.gender ?? anyS.sex ?? "").toString().toLowerCase();
  if (g.startsWith("m") || g === "boy" || g === "ஆண்") return "ஆண்";
  if (g.startsWith("f") || g === "girl" || g === "பெண்") return "பெண்";
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

  const handleExcel = async () => {
    if (rows.length === 0) { toast.error("No students to export"); return; }
    try {
      const res = await fetch(templateUrl);
      const buf = await res.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buf);

      // Use the first sheet as the master template; remove other sheets
      const ws = wb.worksheets[0];
      // Remove additional sheets so output is single-page model
      for (let i = wb.worksheets.length - 1; i >= 1; i--) {
        wb.removeWorksheet(wb.worksheets[i].id);
      }

      // Page setup: A4 landscape, fit to page
      ws.pageSetup = {
        ...(ws.pageSetup || {}),
        paperSize: 9, // A4
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 1,
        margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
      };

      // Fill term row J8 with selected month label
      const termCell = ws.getCell("J8");
      termCell.value = `தவணை : ${monthLabel}`;

      // Fill student rows starting at row 11
      const startRow = 11;
      // Clear existing sample rows 11..35 first (preserve formatting)
      for (let r = startRow; r <= 35; r++) {
        ["C","D","E","F","G","H","I","J","K","L","M","N","O"].forEach(col => {
          const cell = ws.getCell(`${col}${r}`);
          cell.value = null;
        });
      }

      rows.forEach((r, idx) => {
        const rowIdx = startRow + idx;
        if (rowIdx > 35) return; // template sheet capacity
        ws.getCell(`C${rowIdx}`).value = idx + 1;                     // தொடர் இல
        ws.getCell(`D${rowIdx}`).value = r.student.full_name;          // மாணவர் பெயர்
        ws.getCell(`E${rowIdx}`).value = r.student.nic ?? "";          // அடையாள அட்டை
        ws.getCell(`F${rowIdx}`).value = r.student.dob ?? "";          // DOB
        ws.getCell(`G${rowIdx}`).value = genderLabel(r.student);       // ஆண்/பெண்
        ws.getCell(`H${rowIdx}`).value = DEFAULT_FROM;                 // இருந்து
        ws.getCell(`I${rowIdx}`).value = DEFAULT_TO;                   // வரை
        ws.getCell(`J${rowIdx}`).value = DEFAULT_ROUTE;                // பாதை இல
        // K (மாணவர் ஒப்பம்), L (பெறுமதி), M..O (மாதங்கள்) → blank
      });

      const out = await wb.xlsx.writeBuffer();
      const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Season_Report_${month}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Excel downloaded");
    } catch (e: any) {
      console.error(e);
      toast.error("Excel export failed: " + (e?.message ?? "unknown"));
    }
  };

  const ensureTamilFont = async () => {
    const id = "noto-tamil-font-link";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;600;700&display=swap";
      document.head.appendChild(link);
    }
    // Wait for the font to actually load (browser shapes Tamil correctly with it)
    try {
      await (document as any).fonts.load('14px "Noto Sans Tamil"');
      await (document as any).fonts.load('700 14px "Noto Sans Tamil"');
      await (document as any).fonts.ready;
    } catch {}
  };

  const handlePDF = async () => {
    if (rows.length === 0) { toast.error("No students to export"); return; }
    let host: HTMLDivElement | null = null;
    try {
      await ensureTamilFont();

      // A4 landscape @ 96dpi ≈ 1123 x 794 px
      const PAGE_W = 1123;
      host = document.createElement("div");
      host.style.position = "fixed";
      host.style.left = "-10000px";
      host.style.top = "0";
      host.style.width = `${PAGE_W}px`;
      host.style.background = "#ffffff";
      host.style.color = "#000000";
      host.style.fontFamily = '"Noto Sans Tamil", "Latha", Arial, sans-serif';
      host.style.padding = "24px 28px";
      host.style.boxSizing = "border-box";

      const esc = (s: any) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as any)[c]);

      const rowsHtml = rows.map((r, i) => `
        <tr>
          <td style="text-align:center;">${i + 1}</td>
          <td>${esc(r.student.full_name)}</td>
          <td style="text-align:center;">${esc(r.student.nic ?? "")}</td>
          <td style="text-align:center;">${esc(r.student.dob ?? "")}</td>
          <td style="text-align:center;">${esc(genderLabel(r.student))}</td>
          <td style="text-align:center;">${DEFAULT_FROM}</td>
          <td style="text-align:center;">${DEFAULT_TO}</td>
          <td style="text-align:center;">${DEFAULT_ROUTE}</td>
          <td></td>
          <td></td>
          <td></td>
        </tr>`).join("");

      host.innerHTML = `
        <div style="position:relative;">
          <div style="position:absolute;right:0;top:0;font-size:12px;">படிவ இல 2</div>
          <h1 style="text-align:center;margin:0;font-size:20px;font-weight:700;">இலங்கை போக்குவரத்து சபை - வடக்கு</h1>
          <h2 style="text-align:center;margin:6px 0 14px;font-size:15px;font-weight:600;">பாடசாலை மாணவர்களுக்கான பருவ கால சீட்டு விண்ணப்ப படிவம்</h2>
        </div>
        <table style="width:100%;font-size:12px;margin-bottom:8px;border-collapse:collapse;">
          <tr>
            <td style="width:55%;padding:2px 0;">பெயர் : கிளி/அக்கராயன் மகா வித்தியாலயம்</td>
            <td style="padding:2px 0;">வழங்கும் சாலை : கிளிநொச்சி சாலை</td>
          </tr>
          <tr>
            <td style="padding:2px 0;">விலாசம் : அக்கராயன்குளம், கிளிநொச்சி.</td>
            <td style="padding:2px 0;">தவணை : ${esc(monthLabel)}</td>
          </tr>
          <tr>
            <td style="padding:2px 0;">வகுப்பு தரம் : க.பொ.த உயர்தரம் 12,13</td>
            <td></td>
          </tr>
        </table>
        <table style="width:100%;border-collapse:collapse;font-size:11px;table-layout:fixed;">
          <colgroup>
            <col style="width:5%;" />
            <col style="width:15%;" />
            <col style="width:11%;" />
            <col style="width:8%;" />
            <col style="width:6%;" />
            <col style="width:8%;" />
            <col style="width:7%;" />
            <col style="width:5%;" />
            <col style="width:10%;" />
            <col style="width:6%;" />
            <col style="width:19%;" />
          </colgroup>
          <thead>
            <tr style="background:#dce6f5;">
              <th style="border:1px solid #555;padding:5px 3px;">தொடர் இல</th>
              <th style="border:1px solid #555;padding:5px 3px;">மாணவர் பெயர்</th>
              <th style="border:1px solid #555;padding:5px 3px;">அடையாள அட்டை இலக்கம்</th>
              <th style="border:1px solid #555;padding:5px 3px;">Date of Birth</th>
              <th style="border:1px solid #555;padding:5px 3px;">ஆண்/பெண்</th>
              <th style="border:1px solid #555;padding:5px 3px;">பயணம் இருந்து</th>
              <th style="border:1px solid #555;padding:5px 3px;">வரை</th>
              <th style="border:1px solid #555;padding:5px 3px;">பாதை இல</th>
              <th style="border:1px solid #555;padding:5px 3px;">மாணவர் ஒப்பம்</th>
              <th style="border:1px solid #555;padding:5px 3px;">பெறுமதி</th>
              <th style="border:1px solid #555;padding:5px 3px;">காரியாலய பாவிப்புக்கு மட்டும் வழங்கப்பட்ட மாதங்கள்</th>
            </tr>
          </thead>
          <tbody style="font-family:inherit;">
            ${rowsHtml.replace(/<td/g, '<td style="border:1px solid #777;padding:5px 4px;"').replace(/style="border:1px solid #777;padding:5px 4px;" style="text-align:center;"/g, 'style="border:1px solid #777;padding:5px 4px;text-align:center;"')}
          </tbody>
        </table>
        <p style="font-size:11px;margin-top:10px;line-height:1.5;">மேற்தரப்பட்ட மாணவர்கள் யாவரும் இப்பாடசாலையில் முழு நேர மாணவர்களாக கல்வி கற்பவர்கள் என்றும், இவர்களுக்கு பருவ கால சீட்டு வழங்கலாம் என்றும் சிபாரிசு செய்கின்றேன்.</p>
        <table style="width:100%;font-size:11px;margin-top:18px;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;width:50%;">வகுப்பாசிரியர் பெயர் : ........................</td>
            <td style="padding:6px 0;">சீட்டு தயாரித்து வழங்கியவர் : ...............</td>
          </tr>
          <tr>
            <td style="padding:6px 0;">வகுப்பாசிரியர் ஒப்பம் : ........................</td>
            <td style="padding:6px 0;">சீட்டு கொடுபட வேண்டிய திகதி : ............</td>
          </tr>
          <tr>
            <td style="padding:6px 0;">பதிவாளர் ஒப்பம் : ...................&nbsp;&nbsp;&nbsp;&nbsp;திகதி : ....................</td>
            <td style="padding:6px 0;">சாலை அதிபரின் ஒப்பம் : ........................</td>
          </tr>
        </table>`;

      document.body.appendChild(host);
      // Give layout a moment
      await new Promise(r => setTimeout(r, 100));

      const canvas = await html2canvas(host, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();   // 297
      const pdfH = pdf.internal.pageSize.getHeight();  // 210
      const margin = 5;
      const availW = pdfW - margin * 2;
      const ratio = canvas.height / canvas.width;
      let imgH = availW * ratio;
      let imgW = availW;
      if (imgH > pdfH - margin * 2) {
        imgH = pdfH - margin * 2;
        imgW = imgH / ratio;
      }
      const x = (pdfW - imgW) / 2;
      pdf.addImage(imgData, "PNG", x, margin, imgW, imgH);
      pdf.save(`Season_Report_${month}.pdf`);
      toast.success("PDF downloaded");
    } catch (e: any) {
      console.error(e);
      toast.error("PDF export failed: " + (e?.message ?? "unknown"));
    } finally {
      if (host && host.parentNode) host.parentNode.removeChild(host);
    }
  };

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">Monthly Season Ticket Report (Tamil)</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Month / தவணை</label>
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
          Excel uses your uploaded template (no layout change). PDF renders A4 landscape with Tamil text — fits on one page, no cut-off. Default route: {DEFAULT_ROUTE}, From: {DEFAULT_FROM}, To: {DEFAULT_TO}. மாணவர் ஒப்பம் & மாதங்கள் columns are intentionally blank.
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
                <th className="text-left p-3 text-xs uppercase text-muted-foreground">NIC</th>
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
                  <td className="p-3 text-xs text-muted-foreground">{r.student.nic ?? "-"}</td>
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