"use client";

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Motorcycle } from '@/lib/types';
import * as XLSX from 'xlsx';

interface ExportMotorcyclesButtonProps {
  motorcycles: Motorcycle[];
}

export function ExportMotorcyclesButton({ motorcycles }: ExportMotorcyclesButtonProps) {
  const handleExport = () => {
    // Prepare data for Excel
    const data = motorcycles.map(moto => ({
      'Marca': moto.make,
      'Modelo': moto.model,
      'Año': moto.year,
      'Placa': moto.plate,
      'Fecha de Ingreso': new Date(moto.intakeDate).toLocaleDateString('es-CO'),
      'Cliente': moto.customer.name,
      'Email del Cliente': moto.customer.email || 'N/A',
      'Teléfono del Cliente': moto.customer.phone || 'N/A',
      'Cédula del Cliente': moto.customer.cedula || 'N/A'
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    // Auto-size columns
    const colWidths = [
      { wch: 15 }, // Marca
      { wch: 15 }, // Modelo
      { wch: 8 },  // Año
      { wch: 12 }, // Placa
      { wch: 15 }, // Fecha de Ingreso
      { wch: 25 }, // Cliente
      { wch: 25 }, // Email del Cliente
      { wch: 15 }, // Teléfono del Cliente
      { wch: 15 }  // Cédula del Cliente
    ];
    ws['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Motocicletas');

    // Generate and download file
    const fileName = `motocicletas-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <Button
      onClick={handleExport}
      variant="outline"
      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
      disabled={motorcycles.length === 0}
    >
      <Download className="mr-2 h-4 w-4" />
      Exportar Excel
    </Button>
  );
}