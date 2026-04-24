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
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    opts.push({ value, label });
  }
  return opts;
}

function genderLabel(s: Student): string {
  const anyS = s as any;
  const g = (anyS.gender ?? anyS.sex ?? "").toString().toLowerCase();
  if (g.startsWith("m") || g === "boy" || g === "male" || g === "ஆண்") return "M";
  if (g.startsWith("f") || g === "girl" || g === "female" || g === "பெண்") return "F";
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

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const isCurrentMonth = month === currentMonth;

    return filtered
      .map(s => {
        const payment = paymentHistory.find(p => p.student_id === s.id && p.month === month);
        if (!payment && !isCurrentMonth) return null;
        const status = payment?.status ?? s.payment_status;
        return { student: s, status, paidDate: payment?.paid_date ?? "-" };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null && r.status === "paid");
  }, [students, paymentHistory, month, batchFilter, streamFilter]);

  const handleExcel = async () => {
    if (rows.length === 0) { toast.error("No paid students to export"); return; }
    try {
      const res = await fetch(templateUrl);
      const buf = await res.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buf);
      const ws = wb.worksheets[0];
      for (let i = wb.worksheets.length - 1; i >= 1; i--) {
        wb.removeWorksheet(wb.worksheets[i].id);
      }
      ws.pageSetup = {
        ...(ws.pageSetup || {}),
        paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 1,
        margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
      };
      const termCell = ws.getCell("J8");
      termCell.value = `தவணை : ${monthLabel}`;
      const startRow = 11;
      for (let r = startRow; r <= 35; r++) {
        ["C","D","E","F","G","H","I","J","K","L","M","N","O"].forEach(col => {
          ws.getCell(`${col}${r}`).value = null;
        });
      }
      rows.forEach((r, idx) => {
        const rowIdx = startRow + idx;
        if (rowIdx > 35) return;
        ws.getCell(`C${rowIdx}`).value = idx + 1;
        ws.getCell(`D${rowIdx}`).value = r.student.full_name;
        ws.getCell(`E${rowIdx}`).value = r.student.nic ?? "";
        ws.getCell(`F${rowIdx}`).value = r.student.dob ?? "";
        ws.getCell(`G${rowIdx}`).value = genderLabel(r.student);
        ws.getCell(`H${rowIdx}`).value = DEFAULT_FROM;
        ws.getCell(`I${rowIdx}`).value = DEFAULT_TO;
        ws.getCell(`J${rowIdx}`).value = DEFAULT_ROUTE;
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
    try {
      await (document as any).fonts.load('14px "Noto Sans Tamil"');
      await (document as any).fonts.load('700 14px "Noto Sans Tamil"');
      await (document as any).fonts.ready;
    } catch {}
  };

  // Single-row header — காரியாலய last col spans 3 via width only, no rowspan/colspan confusion
  const TABLE_COLS = `
    <colgroup>
      <col style="width:4%;" />
      <col style="width:15%;" />
      <col style="width:12%;" />
      <col style="width:8%;" />
      <col style="width:5%;" />
      <col style="width:11%;" />
      <col style="width:5%;" />
      <col style="width:12%;" />
      <col style="width:5%;" />
      <col style="width:7%;" />
      <col style="width:7%;" />
      <col style="width:9%;" />
    </colgroup>`;

  const TABLE_THEAD = (BH: string) => `
    <thead>
      <tr style="background:#dce6f5;">
        <th style="${BH}padding:5px 2px;font-size:9.5px;text-align:center;">தொடர்<br/>இல</th>
        <th style="${BH}padding:5px 2px;font-size:9.5px;text-align:center;">மாணவர் பெயர்</th>
        <th style="${BH}padding:5px 2px;font-size:9.5px;text-align:center;">அடையாள அட்டை<br/>இலக்கம்</th>
        <th style="${BH}padding:5px 2px;font-size:9.5px;text-align:center;">Date of<br/>Birth</th>
        <th style="${BH}padding:5px 2px;font-size:9.5px;text-align:center;">ஆண்/<br/>பெண்</th>
        <th style="${BH}padding:5px 2px;font-size:9.5px;text-align:center;">பயணம்<br/>செய்யுமிடம்</th>
        <th style="${BH}padding:5px 2px;font-size:9.5px;text-align:center;">பாதை<br/>இல</th>
        <th style="${BH}padding:5px 2px;font-size:9.5px;text-align:center;">மாணவர்<br/>ஒப்பம்</th>
        <th style="${BH}padding:5px 2px;font-size:9.5px;text-align:center;">பெறு<br/>மதி</th>
        <th style="${BH}padding:5px 2px;font-size:9px;text-align:center;" colspan="3">காரியாலய பாவிப்புக்கு மட்டும்<br/>வழங்கப்பட்ட மாதங்கள்</th>
      </tr>
    </thead>`;

  const buildPageHTML = (
    pageRows: typeof rows,
    globalOffset: number,
    monthLabelStr: string,
    esc: (s: any) => string,
    isFirst: boolean,
    isLast: boolean
  ) => {
    const B = "border:1px solid #777;";
    const BH = "border:1px solid #555;";

    const rowsHtml = pageRows.map((r, i) => `
      <tr style="height:26px;">
        <td style="${B}padding:2px;text-align:center;font-size:10px;">${globalOffset + i + 1}</td>
        <td style="${B}padding:2px 4px;font-size:10px;">${esc(r.student.full_name)}</td>
        <td style="${B}padding:2px;text-align:center;font-size:10px;">${esc(r.student.nic ?? "")}</td>
        <td style="${B}padding:2px;text-align:center;font-size:10px;">${esc(r.student.dob ?? "")}</td>
        <td style="${B}padding:2px;text-align:center;font-size:10px;">${esc(genderLabel(r.student))}</td>
        <td style="${B}padding:2px;text-align:center;font-size:10px;">${DEFAULT_FROM} - ${DEFAULT_TO}</td>
        <td style="${B}padding:2px;text-align:center;font-size:10px;">${DEFAULT_ROUTE}</td>
        <td style="${B}padding:2px;"></td>
        <td style="${B}padding:2px;"></td>
        <td style="${B}padding:2px;"></td>
        <td style="${B}padding:2px;"></td>
        <td style="${B}padding:2px;"></td>
      </tr>`).join("");

    const headerHTML = isFirst ? `
      <div style="text-align:center;margin-bottom:2px;">
        <div style="font-size:18px;font-weight:700;margin-bottom:1px;">இலங்கை போக்குவரத்து சபை - வடக்கு</div>
        <div style="font-size:13px;font-weight:600;margin-bottom:6px;">பாடசாலை மாணவர்களுக்கான பருவ கால சீட்டு விண்ணப்ப படிவம்</div>
      </div>
      <table style="width:100%;font-size:11px;margin-bottom:8px;border-collapse:collapse;">
        <tr>
          <td style="width:55%;padding:1px 0;">பெயர் :- கிளி/அக்கராயன் மகா வித்தியாலயம்</td>
          <td style="padding:1px 0;">வழங்கும் சாலை : கிளிநொச்சி சாலை</td>
        </tr>
        <tr>
          <td style="padding:1px 0;">விலாசம் :- அக்கராயன்குளம், கிளிநொச்சி.</td>
          <td style="padding:1px 0;">தவணை : ${esc(monthLabelStr)}</td>
        </tr>
        <tr>
          <td style="padding:1px 0;">வகுப்பு தரம் :- க.பொ.த உயர்தரம் 12,13</td>
          <td></td>
        </tr>
      </table>` : `
      <div style="font-size:11px;font-weight:600;margin-bottom:4px;text-align:right;color:#333;">தவணை : ${esc(monthLabelStr)} (தொடர்ச்சி)</div>`;

    const footerHTML = isLast ? `
      <p style="font-size:10.5px;margin-top:8px;margin-bottom:4px;line-height:1.6;">மேற்தரப்பட்ட மாணவர்கள் யாவரும் இப்பாடசாலையில் முழு நேர மாணவர்களாக கல்வி கற்பவர்கள் என்றும் மேலும் இவர்கள் பிற இடங்களில் பகுதிநேர வேலைக்கென அமர்த்தப்பட்டவர்கள் அல்ல என்றும் இவர்களுக்கு பருவ கால சீட்டு வழங்கலாம் என்றும் சிபாரிசு செய்கின்றேன்.</p>
      <table style="width:100%;font-size:10.5px;border-collapse:collapse;table-layout:fixed;">
        <colgroup>
          <col style="width:33%;" />
          <col style="width:34%;" />
          <col style="width:33%;" />
        </colgroup>
        <tr>
          <td style="padding:5px 0;">வகுப்பாசிரியர் பெயர் : ................................</td>
          <td style="padding:5px 0;"></td>
          <td style="padding:5px 0;">சீட்டு தயாரித்து வழங்கியவர் : ................................</td>
        </tr>
        <tr>
          <td style="padding:5px 0;">வகுப்பாசிரியர் ஒப்பம் : ................................</td>
          <td style="padding:5px 0;text-align:center;">பதிவாளர் ஒப்பம் : ........................................&nbsp;&nbsp;திகதி : ......................................</td>
          <td style="padding:5px 0;">சீட்டு கொடுபட வேண்டிய திகதி : ................................</td>
        </tr>
        <tr>
          <td style="padding:5px 0;"></td>
          <td style="padding:5px 0;"></td>
          <td style="padding:5px 0;">சாலை அதிபரின் ஒப்பம் : ................................</td>
        </tr>
      </table>` : "";

    return `
      ${headerHTML}
      <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
        ${TABLE_COLS}
        ${TABLE_THEAD(BH)}
        <tbody>${rowsHtml}</tbody>
      </table>
      ${footerHTML}`;
  };

  const handlePDF = async () => {
    if (rows.length === 0) { toast.error("No paid students to export"); return; }
    let host: HTMLDivElement | null = null;
    try {
      await ensureTamilFont();

      const esc = (s: any) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as any)[c]);

      const ROWS_PER_PAGE = 20;
      const pages: typeof rows[] = [];
      for (let i = 0; i < rows.length; i += ROWS_PER_PAGE) {
        pages.push(rows.slice(i, i + ROWS_PER_PAGE));
      }
      const totalPages = pages.length;

      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const margin = 4;

      for (let p = 0; p < totalPages; p++) {
        const isFirst = p === 0;
        const isLast = p === totalPages - 1;
        const globalOffset = p * ROWS_PER_PAGE;

        const PAGE_W = 1122;
        const PAGE_H = 794;
        host = document.createElement("div");
        host.style.cssText = `
          position:fixed;left:-12000px;top:0;
          width:${PAGE_W}px;height:${PAGE_H}px;
          overflow:hidden;background:#ffffff;color:#000000;
          font-family:"Noto Sans Tamil","Latha",Arial,sans-serif;
          padding:16px 22px;box-sizing:border-box;
          display:flex;flex-direction:column;
        `;
        host.innerHTML = buildPageHTML(pages[p], globalOffset, monthLabel, esc, isFirst, isLast);
        document.body.appendChild(host);
        await new Promise(r => setTimeout(r, 150));

        const canvas = await html2canvas(host, {
          scale: 2, backgroundColor: "#ffffff", useCORS: true,
          width: PAGE_W, height: PAGE_H,
        });
        const imgData = canvas.toDataURL("image/png");

        if (p > 0) pdf.addPage("a4", "landscape");
        pdf.addImage(imgData, "PNG", margin, margin, pdfW - margin * 2, pdfH - margin * 2);

        if (host.parentNode) host.parentNode.removeChild(host);
        host = null;
      }

      pdf.save(`Season_Report_${month}.pdf`);
      toast.success(`PDF downloaded — ${totalPages} page(s)`);
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
          Excel uses your uploaded template (no layout change). PDF renders A4 landscape with Tamil text. Default route: {DEFAULT_ROUTE}, From: {DEFAULT_FROM}, To: {DEFAULT_TO}. Only <strong>Paid</strong> students appear in the report.
        </p>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h4 className="font-semibold text-foreground text-sm">Preview — {monthLabel}</h4>
          <span className="text-xs text-muted-foreground">{rows.length} paid students</span>
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
          {rows.length === 0 && <p className="text-center text-muted-foreground py-8">No paid students for this month</p>}
        </div>
      </div>
    </div>
  );
}