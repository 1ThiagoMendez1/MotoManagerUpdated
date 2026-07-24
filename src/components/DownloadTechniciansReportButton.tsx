"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import * as XLSX from 'xlsx';
import type { Technician } from "@/lib/types";

export function DownloadTechniciansReportButton({ technicians }: { technicians: Technician[] }) {
  const handleDownload = () => {
    // Preparar los datos
    const rows = technicians.map((tech) => {
      const orders = tech.workOrders || [];
      const diag = orders.filter(wo => wo.status?.toLowerCase() === 'diagnosticando').length;
      const rep = orders.filter(wo => wo.status?.toLowerCase() === 'reparado').length;
      const ent = orders.filter(wo => wo.status?.toLowerCase() === 'entregado').length;
      
      const total = orders.length;
      const completed = rep + ent;
      const efficiency = total > 0 ? ((completed / total) * 100).toFixed(1) + '%' : '0%';

      return {
        "Técnico": tech.name,
        "Correo": tech.email || "N/A",
        "Teléfono": tech.phone || "N/A",
        "Especialidad": tech.specialty || "N/A",
        "Órdenes Totales": total,
        "En Diagnóstico (Pendiente)": diag,
        "Reparadas (No Entregadas)": rep,
        "Entregadas (Finalizadas)": ent,
        "Total Completadas": completed,
        "Eficiencia (%)": efficiency
      };
    });

    if (rows.length === 0) return;

    // Crear el libro y la hoja
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // Ajustar el ancho de las columnas para mayor claridad
    ws['!cols'] = [
      { wch: 25 }, // Técnico
      { wch: 20 }, // Especialidad
      { wch: 18 }, // Totales
      { wch: 25 }, // En Diagnóstico
      { wch: 25 }, // Reparadas
      { wch: 25 }, // Entregadas
      { wch: 20 }, // Total completadas
      { wch: 15 }  // Eficiencia
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Rendimiento Técnicos");

    // Generar y descargar el archivo XLSX
    XLSX.writeFile(wb, `Rendimiento_Tecnicos_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <Button onClick={handleDownload} variant="outline" size="sm" className="flex items-center gap-2">
      <Download className="w-4 h-4" />
      Descargar Análisis
    </Button>
  );
}
