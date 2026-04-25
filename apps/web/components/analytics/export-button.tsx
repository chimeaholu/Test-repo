"use client";

import React from "react";
import { DownloadIcon } from "@/components/icons";

function escapeCsv(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function sanitizePdf(value: string): string {
  return value
    .replace(/[^\x20-\x7E]/g, " ")
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)");
}

function buildSimplePdf(lines: string[]): string {
  const safeLines = lines.length > 0 ? lines.slice(0, 28).map(sanitizePdf) : ["Agrodomain analytics export"];
  const content = [
    "BT",
    "/F1 12 Tf",
    "50 760 Td",
    "15 TL",
    ...safeLines.flatMap((line, index) => (index === 0 ? [`(${line}) Tj`] : ["T*", `(${line}) Tj`])),
    "ET",
  ].join("\n");

  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj",
    `4 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  }

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  pdf += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return pdf;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ExportButton(props: {
  csvRows: string[][];
  filenamePrefix: string;
  pdfLines: string[];
}) {
  function exportCsv(): void {
    const csv = props.csvRows.map((row) => row.map(escapeCsv).join(",")).join("\n");
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${props.filenamePrefix}.csv`);
  }

  function exportPdf(): void {
    const pdf = buildSimplePdf(props.pdfLines);
    downloadBlob(new Blob([pdf], { type: "application/pdf" }), `${props.filenamePrefix}.pdf`);
  }

  return (
    <div className="analytics-export-actions">
      <button className="button-secondary" data-testid="analytics-export-csv" onClick={exportCsv} type="button">
        <DownloadIcon aria-hidden="true" size={16} />
        Export CSV
      </button>
      <button className="button-ghost" data-testid="analytics-export-pdf" onClick={exportPdf} type="button">
        <DownloadIcon aria-hidden="true" size={16} />
        Export PDF
      </button>
    </div>
  );
}
