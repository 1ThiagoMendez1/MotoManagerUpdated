"use client";

import { Button } from "@/components/ui/button";
import { FileDown, AlertTriangle } from "lucide-react";
import * as XLSX from "xlsx";
import type { InventoryItem } from "@/lib/types";

type ExportLowStockButtonProps = {
  inventory: InventoryItem[];
};

export function ExportLowStockButton({ inventory }: ExportLowStockButtonProps) {
  const handleExport = () => {
    // Filter only low stock items
    const lowStockItems = inventory.filter((item) => item.quantity <= item.minimumQuantity);

    if (lowStockItems.length === 0) {
      alert("No hay artículos con stock bajo en este momento.");
      return;
    }

    const dataToExport = lowStockItems.map((item) => ({
      "ID": item.id,
      "Nombre": item.name,
      "SKU": item.sku,
      "Categoría": item.category,
      "Ubicación": item.location,
      "Cantidad Actual": item.quantity,
      "Cantidad Mínima": item.minimumQuantity,
      "Diferencia": item.minimumQuantity - item.quantity,
      "Precio Venta (COP)": item.price,
      "Proveedor": item.supplier,
      "Precio Proveedor (COP)": item.supplierPrice,
      "Estado": "STOCK BAJO",
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stock_Bajo");

    // Set column widths for better readability
    worksheet["!cols"] = [
      { wch: 8 },   // ID
      { wch: 30 },  // Nombre
      { wch: 15 },  // SKU
      { wch: 15 },  // Categoría
      { wch: 15 },  // Ubicación
      { wch: 15 },  // Cantidad Actual
      { wch: 15 },  // Cantidad Mínima
      { wch: 12 },  // Diferencia
      { wch: 20 },  // Precio Venta (COP)
      { wch: 20 },  // Proveedor
      { wch: 22 },  // Precio Proveedor (COP)
      { wch: 12 },  // Estado
    ];

    // Generate filename with current date
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    const filename = `Stock_Bajo_${dateStr}.xlsx`;

    XLSX.writeFile(workbook, filename);
  };

  // Count low stock items
  const lowStockCount = inventory.filter((item) => item.quantity <= item.minimumQuantity).length;

  return (
    <Button
      variant="outline"
      onClick={handleExport}
      className="bg-orange-500 text-white hover:bg-orange-600 border-orange-500"
    >
      <AlertTriangle className="mr-2 h-4 w-4" />
      Stock Bajo ({lowStockCount})
    </Button>
  );
}