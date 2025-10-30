'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Sale } from '@/lib/types';
import * as XLSX from 'xlsx';

interface ExportDirectSalesButtonProps {
  sales: Sale[];
}

export function ExportDirectSalesButton({ sales }: ExportDirectSalesButtonProps) {
  const handleExport = () => {
    // Prepare data for Excel
    const data = sales.map(sale => ({
      'Número de Venta': sale.saleNumber,
      'Fecha': new Date(sale.date).toLocaleDateString('es-CO'),
      'Cliente': sale.customer?.name || sale.customerName || 'Cliente de Mostrador',
      'Método de Pago': sale.paymentMethod || 'N/A',
      'Total': sale.total,
      'Artículos': sale.items?.map(item => `${item.quantity}x ${item.name || 'N/A'}`).join('; ') || 'N/A'
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    // Auto-size columns
    const colWidths = [
      { wch: 15 }, // Número de Venta
      { wch: 12 }, // Fecha
      { wch: 25 }, // Cliente
      { wch: 15 }, // Método de Pago
      { wch: 12 }, // Total
      { wch: 40 }  // Artículos
    ];
    ws['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas Directas');

    // Generate and download file
    const fileName = `ventas-directas-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <Button
      onClick={handleExport}
      variant="outline"
      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
      disabled={sales.length === 0}
    >
      <Download className="mr-2 h-4 w-4" />
      Exportar Directas
    </Button>
  );
}