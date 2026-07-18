"use client";

import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import type { Sale } from "@/lib/types";

type ExportSalesButtonProps = {
  sales: Sale[];
};

export function ExportSalesButton({ sales }: ExportSalesButtonProps) {
  const handleExport = () => {
    const dataToExport = sales.map((sale) => {
        let details = '';
        if (sale.workOrderId && sale.workOrder) {
            details = sale.workOrder.issueDescription;
        } else if (sale.items && sale.items.length > 0) {
            // This is a simplification. In a real app, you'd fetch item names.
            details = sale.items.map(item => `ID:${item.inventoryItemId} (x${item.quantity})`).join(', ');
        }

        return {
            "ID Venta": sale.id,
            "Tipo Venta": sale.workOrderId ? 'Servicio' : 'Mostrador',
            "ID Orden de Trabajo": sale.workOrderId || "N/A",
            "Fecha": format(new Date(sale.date), "yyyy-MM-dd"),
            "Cliente": sale.workOrder ? sale.workOrder.motorcycle.customer.name : (sale.customer?.name || sale.customerName || "Cliente Mostrador"),
            "Motocicleta": sale.workOrder ? `${sale.workOrder.motorcycle.make} ${sale.workOrder.motorcycle.model}` : "N/A",
            "Detalles": details,
            "Total (COP)": sale.total,
        }
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ventas");

    // Set column widths
    worksheet["!cols"] = [
      { wch: 10 }, // ID Venta
      { wch: 15 }, // Tipo Venta
      { wch: 20 }, // ID Orden de Trabajo
      { wch: 12 }, // Fecha
      { wch: 25 }, // Cliente
      { wch: 25 }, // Motocicleta
      { wch: 40 }, // Detalles
      { wch: 15 }, // Total (COP)
    ];

    XLSX.writeFile(workbook, "Historial_de_Ventas.xlsx");
  };

  return (
    <Button variant="outline" onClick={handleExport}>
      <FileDown className="mr-2 h-4 w-4" />
      Exportar
    </Button>
  );
}