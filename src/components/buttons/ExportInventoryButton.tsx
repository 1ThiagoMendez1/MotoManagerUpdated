"use client";

import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import * as XLSX from "xlsx";
import type { InventoryItem } from "@/lib/types";

type ExportInventoryButtonProps = {
  inventory: InventoryItem[];
};

export function ExportInventoryButton({ inventory }: ExportInventoryButtonProps) {
  const handleExport = () => {
    const dataToExport = inventory.map((item) => ({
      "ID": item.id,
      "Nombre": item.name,
      "SKU": item.sku,
      "Categoría": item.category,
      "Ubicación": item.location,
      "Cantidad": item.quantity,
      "Precio Venta (COP)": item.price,
      "Cantidad Mínima": item.minimumQuantity,
      "Proveedor": item.supplier,
      "Precio Proveedor (COP)": item.supplierPrice,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario");

    // Set column widths for better readability
    worksheet["!cols"] = [
      { wch: 8 },   // ID
      { wch: 30 },  // Nombre
      { wch: 15 },  // SKU
      { wch: 15 },  // Categoría
      { wch: 15 },  // Ubicación
      { wch: 10 },  // Cantidad
      { wch: 20 },  // Precio Venta (COP)
      { wch: 18 },  // Cantidad Mínima
      { wch: 20 },  // Proveedor
      { wch: 22 },  // Precio Proveedor (COP)
    ];

    XLSX.writeFile(workbook, "Reporte_Inventario.xlsx");
  };

  return (
    <Button variant="outline" onClick={handleExport}>
      <FileDown className="mr-2 h-4 w-4" />
      Exportar a Excel
    </Button>
  );
}
