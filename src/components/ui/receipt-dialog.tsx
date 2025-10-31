"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ReceiptData, generateReceiptPDF } from '@/lib/pdfGenerator';
import { Download, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

async function printReceipt(receiptData: ReceiptData) {
  try {
    // Generate the PDF blob
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Create HTML content for PDF
    const receiptHTML = generateReceiptHTML(receiptData);
    const receiptElement = document.createElement('div');
    receiptElement.innerHTML = receiptHTML;
    receiptElement.style.position = 'absolute';
    receiptElement.style.left = '-9999px';
    receiptElement.style.top = '-9999px';
    receiptElement.style.width = '400px';
    receiptElement.style.fontFamily = 'Arial, sans-serif';
    receiptElement.style.fontSize = '12px';
    receiptElement.style.lineHeight = '1.2';
    document.body.appendChild(receiptElement);

    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(receiptElement, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      height: receiptElement.scrollHeight,
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const heightLeft = imgHeight;

    let position = 0;

    // Agregar primera página
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    let remainingHeight = heightLeft - pageHeight;

    // Agregar páginas adicionales si es necesario
    while (remainingHeight > 0) {
      position = remainingHeight - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      remainingHeight -= pageHeight;
    }

    // Convert PDF to blob and create URL
    const pdfBlob = pdf.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);

    // Open PDF in new window and trigger print
    const printWindow = window.open(pdfUrl, '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.onload = () => {
        // Wait a bit for the PDF to load, then trigger print
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };
    }

    // Clean up the URL object after a delay
    setTimeout(() => {
      URL.revokeObjectURL(pdfUrl);
    }, 5000);

  } catch (error) {
    console.error('Error generating PDF for printing:', error);
  } finally {
    // Clean up any remaining elements
    const tempElements = document.querySelectorAll('[style*="position: absolute"][style*="left: -9999px"]');
    tempElements.forEach(el => el.remove());
  }
}

function generateReceiptHTML(data: ReceiptData): string {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return `
    <div style="
      width: 100%;
      max-width: 400px;
      margin: 0 auto;
      padding: 20px;
      font-family: Arial, sans-serif;
      background: white;
      color: black;
      border: 2px solid #333;
    ">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px;">
        <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: #333;">MotoManager</h1>
        <p style="margin: 5px 0; font-size: 14px; color: #666;">Taller de Motocicletas</p>
        <p style="margin: 5px 0; font-size: 12px; color: #666;">Comprobante de Pago</p>
      </div>

      <!-- Sale Info -->
      <div style="margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span style="font-weight: bold;">Número de Venta:</span>
          <span>${data.saleNumber}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span style="font-weight: bold;">Fecha:</span>
          <span>${formatDate(data.date)}</span>
        </div>
        ${data.workOrderId ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span style="font-weight: bold;">Orden de Trabajo:</span>
          <span>${data.workOrderId}</span>
        </div>
        ` : ''}
        ${data.customerName ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span style="font-weight: bold;">Cliente:</span>
          <span>${data.customerName}</span>
        </div>
        ` : ''}
        ${data.motorcycleInfo ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span style="font-weight: bold;">Vehículo:</span>
          <span>${data.motorcycleInfo.make} ${data.motorcycleInfo.model} ${data.motorcycleInfo.year} - ${data.motorcycleInfo.plate}</span>
        </div>
        ` : ''}
        ${data.technicianName ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span style="font-weight: bold;">Técnico:</span>
          <span>${data.technicianName}</span>
        </div>
        ` : ''}
      </div>

      <!-- Items Table -->
      <div style="margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="border-bottom: 1px solid #333;">
              <th style="text-align: left; padding: 5px 0; font-weight: bold;">Producto</th>
              <th style="text-align: center; padding: 5px 0; font-weight: bold;">SKU</th>
              <th style="text-align: center; padding: 5px 0; font-weight: bold;">Cant.</th>
              <th style="text-align: right; padding: 5px 0; font-weight: bold;">Precio</th>
              <th style="text-align: right; padding: 5px 0; font-weight: bold;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.map(item => `
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 5px 0; text-align: left;">
                  <div style="font-weight: bold;">${item.name}</div>
                  ${item.category ? `<div style="font-size: 10px; color: #666;">${item.category}</div>` : ''}
                </td>
                <td style="padding: 5px 0; text-align: center; font-family: monospace; font-size: 10px;">${item.sku || '-'}</td>
                <td style="padding: 5px 0; text-align: center;">${item.quantity}</td>
                <td style="padding: 5px 0; text-align: right;">${formatCurrency(item.price)}</td>
                <td style="padding: 5px 0; text-align: right;">${formatCurrency(item.total)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Subtotal -->
      ${data.subtotal && data.subtotal !== data.total ? `
      <div style="margin-bottom: 5px;">
        <div style="display: flex; justify-content: space-between;">
          <span style="font-weight: bold;">Subtotal:</span>
          <span>${formatCurrency(data.subtotal)}</span>
        </div>
      </div>
      ` : ''}

      <!-- Discount -->
      ${data.discountAmount && data.discountAmount > 0 ? `
      <div style="margin-bottom: 5px;">
        <div style="display: flex; justify-content: space-between; color: #dc2626;">
          <span style="font-weight: bold;">Descuento (${data.discountPercentage}%):</span>
          <span>-${formatCurrency(data.discountAmount)}</span>
        </div>
      </div>
      ` : ''}

      <!-- Labor Cost -->
      ${data.laborCost && data.laborCost > 0 ? `
      <div style="margin-bottom: 10px; padding: 10px; background: #f9f9f9; border-radius: 4px;">
        <div style="display: flex; justify-content: space-between;">
          <span style="font-weight: bold;">Mano de Obra:</span>
          <span>${formatCurrency(data.laborCost)}</span>
        </div>
      </div>
      ` : ''}

      <!-- Total -->
      <div style="border-top: 2px solid #333; padding-top: 10px; margin-top: 20px;">
        <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold;">
          <span>TOTAL:</span>
          <span>${formatCurrency(data.total)}</span>
        </div>
      </div>

      <!-- Footer -->
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #333; font-size: 9px; color: #333;">
        <p style="font-weight: bold; margin-bottom: 10px; font-size: 11px;">Gracias por su preferencia</p>

        <div style="text-align: left; max-width: 350px; margin: 0 auto 15px auto; line-height: 1.3;">
          <p style="margin-bottom: 3px;"><strong>Este documento es un comprobante interno de venta generado por el sistema MotoManager para control administrativo del taller.</strong></p>
          <p style="margin-bottom: 3px;">No constituye factura electrónica ni documento equivalente autorizado por la DIAN.</p>
          <p style="margin-bottom: 3px;">No otorga derechos de deducción de impuestos ni soporta créditos fiscales.</p>
          <p style="margin-bottom: 3px;">El valor aquí registrado corresponde a una transacción comercial interna entre las partes.</p>
          <p style="margin-bottom: 3px; font-style: italic;">"Documento generado automáticamente por MotoManager — Sin validez tributaria."</p>
        </div>

        <div style="border-top: 1px solid #666; padding-top: 8px; margin-top: 10px;">
          <p style="font-weight: bold; font-size: 10px; margin-bottom: 2px;">MotoManager - Sistema de Gestión para Talleres</p>
          <p style="font-size: 8px;">Created by - DevS&STech S.A.S</p>
          <p style="font-size: 8px;">www.devsystech.com.co</p>
          <p style="font-size: 8px; font-style: italic; margin-top: 3px;">MotoManager — Sin validez tributaria.</p>
        </div>
      </div>
    </div>
  `;
}

interface ReceiptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  receiptData: ReceiptData;
}

export function ReceiptDialog({ isOpen, onClose, receiptData }: ReceiptDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    try {
      await generateReceiptPDF(receiptData);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white text-black">
        <DialogHeader>
          <DialogTitle className="text-black">Comprobante de Pago</DialogTitle>
          <DialogDescription className="text-black/80">
            Venta #{receiptData.saleNumber} registrada exitosamente
          </DialogDescription>
        </DialogHeader>

        {/* Receipt Preview */}
        <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
          <div className="text-center mb-4 border-b-2 border-gray-800 pb-2">
            <h2 className="text-xl font-bold text-gray-800">MotoManager</h2>
            <p className="text-sm text-gray-600">Taller de Motocicletas</p>
            <p className="text-xs text-gray-500">Comprobante de Pago</p>
          </div>

          <div className="space-y-2 mb-4 text-sm">
            <div className="flex justify-between">
              <span className="font-semibold">Número de Venta:</span>
              <span>{receiptData.saleNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Fecha:</span>
              <span>{formatDate(receiptData.date)}</span>
            </div>
            {receiptData.workOrderId && (
              <div className="flex justify-between">
                <span className="font-semibold">Orden de Trabajo:</span>
                <span>{receiptData.workOrderId}</span>
              </div>
            )}
            {receiptData.customerName && (
              <div className="flex justify-between">
                <span className="font-semibold">Cliente:</span>
                <span>{receiptData.customerName}</span>
              </div>
            )}
            {receiptData.motorcycleInfo && (
              <div className="flex justify-between">
                <span className="font-semibold">Vehículo:</span>
                <span className="text-right">
                  {receiptData.motorcycleInfo.make} {receiptData.motorcycleInfo.model} {receiptData.motorcycleInfo.year}
                  <br />
                  <span className="text-xs text-gray-500">{receiptData.motorcycleInfo.plate}</span>
                </span>
              </div>
            )}
            {receiptData.technicianName && (
              <div className="flex justify-between">
                <span className="font-semibold">Técnico:</span>
                <span>{receiptData.technicianName}</span>
              </div>
            )}
            {receiptData.paymentMethod && (
              <div className="flex justify-between">
                <span className="font-semibold">Medio de Pago:</span>
                <span>{receiptData.paymentMethod}</span>
              </div>
            )}
          </div>

          <table className="w-full text-xs mb-4 border-collapse">
            <thead>
              <tr className="border-b border-gray-400">
                <th className="text-left py-1 font-semibold">Producto</th>
                <th className="text-center py-1 font-semibold">SKU</th>
                <th className="text-center py-1 font-semibold">Cant.</th>
                <th className="text-right py-1 font-semibold">Precio</th>
                <th className="text-right py-1 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {receiptData.items.map((item, index) => (
                <tr key={index} className="border-b border-gray-200">
                  <td className="py-1 text-left">
                    <div className="font-medium">{item.name}</div>
                    {item.category && (
                      <div className="text-xs text-gray-500">{item.category}</div>
                    )}
                  </td>
                  <td className="py-1 text-center font-mono text-xs">{item.sku || '-'}</td>
                  <td className="py-1 text-center">{item.quantity}</td>
                  <td className="py-1 text-right">{formatCurrency(item.price)}</td>
                  <td className="py-1 text-right">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Subtotal */}
          {(receiptData.subtotal && receiptData.subtotal !== receiptData.total) && (
            <div className="flex justify-between text-sm mb-1">
              <span className="font-semibold">Subtotal:</span>
              <span>{formatCurrency(receiptData.subtotal)}</span>
            </div>
          )}

          {/* Discount */}
          {receiptData.discountAmount && receiptData.discountAmount > 0 && (
            <div className="flex justify-between text-sm mb-1 text-red-600">
              <span className="font-semibold">
                Descuento ({receiptData.discountPercentage}%):
              </span>
              <span>-{formatCurrency(receiptData.discountAmount)}</span>
            </div>
          )}

          {/* Labor Cost */}
          {receiptData.laborCost && receiptData.laborCost > 0 && (
            <div className="bg-gray-100 p-2 rounded mb-2">
              <div className="flex justify-between text-sm">
                <span className="font-semibold">Mano de Obra:</span>
                <span>{formatCurrency(receiptData.laborCost)}</span>
              </div>
            </div>
          )}

          <div className="border-t-2 border-gray-800 pt-2">
            <div className="flex justify-between text-lg font-bold">
              <span>TOTAL:</span>
              <span>{formatCurrency(receiptData.total)}</span>
            </div>
          </div>

          <div className="text-center mt-4 text-xs text-gray-500 border-t border-gray-300 pt-4">
            <p className="font-semibold mb-2">Gracias por su preferencia</p>

            <div className="text-left text-xs leading-tight mb-3 max-w-md mx-auto">
              <p className="mb-1"><strong>Este documento es un comprobante interno de venta generado por el sistema MotoManager para control administrativo del taller.</strong></p>
              <p className="mb-1">No constituye factura electrónica ni documento equivalente autorizado por la DIAN.</p>
              <p className="mb-1">No otorga derechos de deducción de impuestos ni soporta créditos fiscales.</p>
              <p className="mb-1">El valor aquí registrado corresponde a una transacción comercial interna entre las partes.</p>
              <p className="mb-1 italic">"Documento generado automáticamente por MotoManager — Sin validez tributaria."</p>
            </div>

            <div className="border-t border-gray-200 pt-2 mt-3">
              <p className="font-bold text-sm mb-1">MotoManager - Sistema de Gestión para Talleres</p>
              <p className="text-xs">Created by - DevS&STech S.A.S</p>
              <p className="text-xs">www.devsystech.com.co</p>
              <p className="text-xs italic mt-1">MotoManager — Sin validez tributaria.</p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          <Button variant="secondary" onClick={() => printReceipt(receiptData)}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
          <Button onClick={handleDownloadPDF} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generando...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Descargar PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}