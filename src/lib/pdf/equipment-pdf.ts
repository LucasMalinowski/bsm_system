import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Equipment, CalibrationPoint, CalibrationRecord } from "@/types";

const BRAND_BLUE = "#0363a9";
const BRAND_BLUE_RGB: [number, number, number] = [3, 99, 169];
const PAGE_W = 210;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;

type MaintenanceRecord = {
  performed_at: string;
  description: string;
  cost: number | null;
  notes: string | null;
};

type DocRecord = {
  name: string;
  created_at: string;
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
}

function fmtStatus(s: string): string {
  const map: Record<string, string> = {
    active: "Ativo", inactive: "Inativo", under_maintenance: "Em Manutenção",
    calibration: "Em Calibração", retired: "Aposentado",
  };
  return map[s] ?? s;
}

function fmtPeriodicity(p: string | null | undefined): string {
  if (!p) return "—";
  const map: Record<string, string> = {
    semestral: "Semestral", anual: "Anual", bi_anual: "Bi-Anual",
    tri_anual: "Tri-Anual", outro: "Outro",
  };
  return map[p] ?? p;
}

export function generateEquipmentPDF(
  equipment: Equipment & { history?: unknown[] },
  calPoints: CalibrationPoint[],
  calRecords: CalibrationRecord[],
  maintRecords: MaintenanceRecord[],
  docs: DocRecord[],
  companyName: string,
  imageDataUrl?: string | null
): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = 0;

  const addSectionHeader = (title: string) => {
    if (y > 250) { doc.addPage(); y = 14; }
    doc.setFillColor(...BRAND_BLUE_RGB);
    doc.rect(MARGIN, y, CONTENT_W, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(title.toUpperCase(), MARGIN + 3, y + 5.5);
    doc.setTextColor(0, 0, 0);
    y += 10;
  };

  const addRow = (label: string, value: string, xOffset = 0, colWidth = CONTENT_W / 2) => {
    if (y > 270) { doc.addPage(); y = 14; }
    const x = MARGIN + xOffset;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(label, x, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20, 20, 20);
    doc.text(value || "—", x + colWidth * 0.45, y);
    y += 5.5;
  };

  const add2ColRows = (pairs: [string, string][]) => {
    for (let i = 0; i < pairs.length; i += 2) {
      if (y > 270) { doc.addPage(); y = 14; }
      const half = CONTENT_W / 2;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text(pairs[i][0], MARGIN, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(20, 20, 20);
      doc.text(pairs[i][1] || "—", MARGIN + half * 0.45, y);
      if (pairs[i + 1]) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(80, 80, 80);
        doc.text(pairs[i + 1][0], MARGIN + half, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(20, 20, 20);
        doc.text(pairs[i + 1][1] || "—", MARGIN + half + half * 0.45, y);
      }
      y += 5.5;
    }
  };

  // ── Header banner ──────────────────────────────────────────────────────────
  doc.setFillColor(...BRAND_BLUE_RGB);
  doc.rect(0, 0, PAGE_W, 28, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("FICHA DO EQUIPAMENTO", PAGE_W / 2, 12, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(companyName || "BSM System", PAGE_W / 2, 21, { align: "center" });

  y = 34;

  // ── IDENTIFICAÇÃO ──────────────────────────────────────────────────────────
  addSectionHeader("Identificação");

  if (imageDataUrl) {
    const imgW = 42, imgH = 42;
    const imgX = PAGE_W - MARGIN - imgW;
    try {
      doc.addImage(imageDataUrl, "JPEG", imgX, y, imgW, imgH);
    } catch { /* skip on bad image data */ }
  }

  add2ColRows([
    ["Código Interno", equipment.internal_code],
    ["Nome", equipment.name],
    ["Marca", equipment.brand ?? "—"],
    ["Modelo", equipment.model ?? "—"],
    ["Nº de Série", equipment.serial_number ?? "—"],
    ["Escala", equipment.scale ?? "—"],
    ["Categoria", equipment.category?.name ?? "—"],
    ["Localização", equipment.location ?? "—"],
    ["Data de Aquisição", fmtDate(equipment.acquisition_date)],
    ["Status", fmtStatus(equipment.status)],
  ]);

  if (equipment.notes) {
    if (y > 270) { doc.addPage(); y = 14; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text("Observações:", MARGIN, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20, 20, 20);
    const lines = doc.splitTextToSize(equipment.notes, CONTENT_W);
    doc.text(lines, MARGIN, y);
    y += (lines.length * 4) + 3;
  }

  y += 3;

  // ── CALIBRAÇÃO ─────────────────────────────────────────────────────────────
  addSectionHeader("Calibração");
  add2ColRows([
    ["Requer Calibração", equipment.requires_calibration ? "Sim" : "Não"],
    ["Periodicidade", fmtPeriodicity(equipment.calibration_periodicity)],
    ["Última Calibração", fmtDate(equipment.last_calibration)],
    ["Próxima Calibração", fmtDate(equipment.next_calibration)],
  ]);

  y += 3;

  // ── PONTOS DE CALIBRAÇÃO ───────────────────────────────────────────────────
  if (calPoints.length > 0) {
    addSectionHeader("Pontos de Calibração");
    autoTable(doc, {
      startY: y,
      head: [["Ponto", "Critério", "Tolerância de Erro"]],
      body: calPoints.map((p) => [p.point_value, p.criterion, p.error_tolerance != null ? String(p.error_tolerance) : "—"]),
      theme: "striped",
      headStyles: { fillColor: BRAND_BLUE_RGB, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { left: MARGIN, right: MARGIN },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ── HISTÓRICO DE CALIBRAÇÕES ───────────────────────────────────────────────
  if (calRecords.length > 0) {
    if (y > 240) { doc.addPage(); y = 14; }
    addSectionHeader("Histórico de Calibrações");
    autoTable(doc, {
      startY: y,
      head: [["Data", "Realizado por", "Planilha", "Observações"]],
      body: calRecords.map((r) => [
        fmtDate(r.performed_at),
        r.performer?.name ?? "—",
        r.template_doc?.name ?? "—",
        r.notes ?? "—",
      ]),
      theme: "striped",
      headStyles: { fillColor: BRAND_BLUE_RGB, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { left: MARGIN, right: MARGIN },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ── MANUTENÇÃO ─────────────────────────────────────────────────────────────
  if (maintRecords.length > 0) {
    if (y > 240) { doc.addPage(); y = 14; }
    addSectionHeader("Histórico de Manutenção");
    autoTable(doc, {
      startY: y,
      head: [["Data", "Descrição", "Custo (R$)", "Observações"]],
      body: maintRecords.map((r) => [
        fmtDate(r.performed_at),
        r.description,
        r.cost != null ? r.cost.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "—",
        r.notes ?? "—",
      ]),
      theme: "striped",
      headStyles: { fillColor: BRAND_BLUE_RGB, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { left: MARGIN, right: MARGIN },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ── DOCUMENTOS ─────────────────────────────────────────────────────────────
  if (docs.length > 0) {
    if (y > 240) { doc.addPage(); y = 14; }
    addSectionHeader("Documentos Vinculados");
    autoTable(doc, {
      startY: y,
      head: [["Nome do Documento", "Data de Criação"]],
      body: docs.map((d) => [d.name, fmtDate(d.created_at)]),
      theme: "striped",
      headStyles: { fillColor: BRAND_BLUE_RGB, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { left: MARGIN, right: MARGIN },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text(
      `Gerado em ${new Date().toLocaleString("pt-BR")} — Página ${i} de ${totalPages}`,
      PAGE_W / 2,
      pageH - 6,
      { align: "center" }
    );
  }

  const safeName = `ficha-${equipment.internal_code.replace(/[^a-zA-Z0-9\-_]/g, "-")}.pdf`;
  doc.save(safeName);
}
