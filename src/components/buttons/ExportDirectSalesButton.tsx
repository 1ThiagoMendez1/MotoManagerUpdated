'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Sale } from '@/lib/types';

interface ExportDirectSalesButtonProps {
  sales: Sale[];
}

export function ExportDirectSalesButton({ sales }: ExportDirectSalesButtonProps) {
  const handleExport = () => {
    // Create CSV content
    const headers = [
      'Número de Venta',
      'Fecha',
      'Cliente',
      'Método de Pago',
      'Total',
      'Artículos'
    ];

    const csvContent = [
      headers.join(','),
      ...sales.map(sale => [
        sale.saleNumber,
        new Date(sale.date).toLocaleDateString('es-CO'),
        sale.customer?.name || sale.customerName || 'Cliente de Mostrador',
        sale.paymentMethod || 'N/A',
        sale.total,
        sale.items?.map(item => `${item.quantity}x ${item.name || 'N/A'}`).join('; ') || 'N/A'
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ventas-directas-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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