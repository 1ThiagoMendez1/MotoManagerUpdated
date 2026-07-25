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
import { WompiButton } from '@/components/payments/WompiButton';

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

  return `    <div style="
      width: 100%;
      max-width: 400px;
      margin: 0 auto;
      padding: 20px;
      font-family: Arial, sans-serif;
      background: white;
      color: black;
      border: 1px solid #ddd;
    ">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 15px; border-bottom: 1px solid #333; padding-bottom: 15px;">
        <h1 style="margin: 0; font-size: 22px; font-weight: bold; color: #333;">${data.workshopName || 'MotoManager'}</h1>
        <p style="margin: 5px 0; font-size: 14px; color: #666;">Taller de Motocicletas</p>
        <p style="margin: 5px 0; font-size: 14px; font-weight: bold; color: #333;">Comprobante de Pago</p>
      </div>

      <!-- Sale Info -->
      <div style="margin-bottom: 15px; border-bottom: 1px solid #333; padding-bottom: 15px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span style="font-weight: bold;">Número de Venta:</span>
          <span>${data.saleNumber}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span style="font-weight: bold;">Fecha:</span>
          <span>${formatDate(data.date)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span style="font-weight: bold;">Medio de Pago:</span>
          <span>${data.paymentMethod || 'Efectivo'}</span>
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
          <span style="text-align: right;">
            ${data.motorcycleInfo.make} ${data.motorcycleInfo.model}
            <br />
            <span style="font-size: 12px; color: #666;">${data.motorcycleInfo.plate}</span>
          </span>
        </div>
        ` : ''}
        ${data.technicianName ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span style="font-weight: bold;">Técnico:</span>
          <span>${data.technicianName}</span>
        </div>
        ` : ''}
      </div>

      <!-- Items -->
      ${data.items && data.items.length > 0 ? `
      <table style="width: 100%; font-size: 12px; border-collapse: collapse; margin-bottom: 15px;">
        <thead>
          <tr style="border-bottom: 1px solid #333;">
            <th style="text-align: left; padding: 5px 0;">Producto</th>
            <th style="text-align: center; padding: 5px 0;">SKU</th>
            <th style="text-align: center; padding: 5px 0;">Cant.</th>
            <th style="text-align: right; padding: 5px 0;">Precio</th>
            <th style="text-align: right; padding: 5px 0;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${data.items.map(item => `
            <tr>
              <td style="padding: 5px 0; text-align: left;">
                <div style="font-weight: bold;">${item.name}</div>
              </td>
              <td style="padding: 5px 0; text-align: center; font-family: monospace;">${item.sku || '-'}</td>
              <td style="padding: 5px 0; text-align: center;">${item.quantity}</td>
              <td style="padding: 5px 0; text-align: right;">${formatCurrency(item.price)}</td>
              <td style="padding: 5px 0; text-align: right;">${formatCurrency(item.total)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div style="border-bottom: 1px solid #333; margin-bottom: 15px;"></div>
      ` : ''}

      <!-- Totals -->
      <div style="margin-bottom: 15px; border-bottom: 1px solid #333; padding-bottom: 15px;">
        ${(data.subtotal && data.subtotal !== data.total) ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span style="font-weight: bold;">Subtotal:</span>
            <span>${formatCurrency(data.subtotal)}</span>
          </div>
        ` : ''}
        ${(data.discountAmount && data.discountAmount > 0) ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: #d32f2f;">
            <span style="font-weight: bold;">Descuento (${data.discountPercentage}%):</span>
            <span>-${formatCurrency(data.discountAmount)}</span>
          </div>
        ` : ''}
        ${(data.laborCost && data.laborCost > 0) ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span style="font-weight: bold;">Mano de Obra:</span>
            <span>${formatCurrency(data.laborCost)}</span>
          </div>
        ` : ''}
        ${(data.depositAmount && data.depositAmount > 0) ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: #2e7d32;">
            <span style="font-weight: bold;">Abono recibido:</span>
            <span>-${formatCurrency(data.depositAmount)}</span>
          </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; margin-top: 10px;">
          <span>TOTAL SERVICIO:</span>
          <span>${formatCurrency(data.total)}</span>
        </div>
        ${(data.remainingBalance !== undefined && data.remainingBalance !== data.total) ? `
          <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; margin-top: 5px; color: #d32f2f;">
            <span>Saldo a Pagar:</span>
            <span>${formatCurrency(data.remainingBalance)}</span>
          </div>
        ` : ''}
      </div>

      <!-- Legal Text & Footer -->
      <div style="text-align: center; margin-top: 20px; font-size: 11px; color: #444; line-height: 1.4; border-bottom: 1px solid #333; padding-bottom: 15px; margin-bottom: 15px;">
        <p style="font-weight: bold; font-size: 13px; margin-bottom: 15px;">Gracias por su preferencia</p>
        <p style="margin-bottom: 5px;">Este documento es un comprobante interno de venta generado por el sistema ${data.workshopName || 'MotoManager'} para control administrativo del taller.</p>
        <p style="margin-bottom: 5px;">No constituye factura electrónica ni documento equivalente autorizado por la DIAN.</p>
        <p style="margin-bottom: 5px;">No otorga derechos de deducción de impuestos ni soporta créditos fiscales.</p>
        <p style="margin-bottom: 10px;">El valor aquí registrado corresponde a una transacción comercial interna entre las partes.</p>
        <p style="font-style: italic;">"Documento generado automáticamente por ${data.workshopName || 'MotoManager'} — Sin validez tributaria."</p>
      </div>

      <div style="text-align: center; font-size: 11px; color: #444; border-bottom: 1px solid #333; padding-bottom: 10px; margin-bottom: 10px;">
        <p style="font-weight: bold; margin: 0 0 5px 0;">MotoManager - CRM</p>
        <p style="margin: 0;">Created by - Mivra S.A.S</p>
      </div>

      <div style="text-align: center; font-size: 11px; color: #444;">
        <p style="margin: 0 0 5px 0;">www.mivra.com.co</p>
        <p style="margin: 0; font-style: italic;">MotoManager — Sin validez tributaria.</p>
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

  const printReceipt = (data: ReceiptData) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Comprobante de Pago - ${data.saleNumber}</title>
        </head>
        <body>
          ${generateReceiptHTML(data)}
          <script>
            window.onload = () => {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
      <DialogContent className="sm:max-w-md bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle>Comprobante de Pago</DialogTitle>
          <DialogDescription>
            Venta #{receiptData.saleNumber} registrada exitosamente
          </DialogDescription>
        </DialogHeader>

        {/* Receipt Preview */}
        <div className="bg-white text-black border border-gray-300 rounded-lg p-6 max-h-96 overflow-y-auto font-sans shadow-inner">
          <div className="text-center mb-4 border-b border-gray-300 pb-4">
            <h2 className="text-xl font-bold text-gray-800 m-0">{receiptData.workshopName || 'MotoManager'}</h2>
            <p className="text-sm text-gray-600 m-1">Taller de Motocicletas</p>
            <p className="text-sm font-bold text-gray-800 m-1">Comprobante de Pago</p>
          </div>

          <div className="space-y-2 mb-4 text-sm border-b border-gray-300 pb-4">
            <div className="flex justify-between">
              <span className="font-semibold">Número de Venta:</span>
              <span>{receiptData.saleNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Fecha:</span>
              <span>{formatDate(receiptData.date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Medio de Pago:</span>
              <span>{receiptData.paymentMethod || 'Efectivo'}</span>
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
                  {receiptData.motorcycleInfo.make} {receiptData.motorcycleInfo.model}
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
          </div>

          {receiptData.items && receiptData.items.length > 0 && (
            <>
              <table className="w-full text-xs mb-4 border-collapse">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left py-2 font-semibold">Producto</th>
                    <th className="text-center py-2 font-semibold">SKU</th>
                    <th className="text-center py-2 font-semibold">Cant.</th>
                    <th className="text-right py-2 font-semibold">Precio</th>
                    <th className="text-right py-2 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptData.items.map((item, index) => (
                    <tr key={index}>
                      <td className="py-2 text-left">
                        <div className="font-bold">{item.name}</div>
                      </td>
                      <td className="py-2 text-center font-mono text-xs">{item.sku || '-'}</td>
                      <td className="py-2 text-center">{item.quantity}</td>
                      <td className="py-2 text-right">{formatCurrency(item.price)}</td>
                      <td className="py-2 text-right">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-b border-gray-300 mb-4"></div>
            </>
          )}

          {/* Totals */}
          <div className="space-y-2 mb-4 border-b border-gray-300 pb-4">
            {Boolean(receiptData.subtotal && receiptData.subtotal !== receiptData.total) && (
              <div className="flex justify-between text-sm">
                <span className="font-semibold">Subtotal:</span>
                <span>{formatCurrency(receiptData.subtotal!)}</span>
              </div>
            )}
            {Boolean(receiptData.discountAmount && receiptData.discountAmount > 0) && (
              <div className="flex justify-between text-sm text-red-600">
                <span className="font-semibold">
                  Descuento ({receiptData.discountPercentage}%):
                </span>
                <span>-{formatCurrency(receiptData.discountAmount!)}</span>
              </div>
            )}
            {Boolean(receiptData.laborCost && receiptData.laborCost > 0) && (
              <div className="flex justify-between text-sm">
                <span className="font-semibold">Mano de Obra:</span>
                <span>{formatCurrency(receiptData.laborCost!)}</span>
              </div>
            )}
            {Boolean(receiptData.depositAmount && receiptData.depositAmount > 0) && (
              <div className="flex justify-between text-sm text-green-700">
                <span className="font-semibold">Abono recibido:</span>
                <span>-{formatCurrency(receiptData.depositAmount!)}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center pt-2 mt-2 text-base font-bold">
              <span>TOTAL SERVICIO:</span>
              <span>{formatCurrency(receiptData.total)}</span>
            </div>

            {(receiptData.remainingBalance !== undefined && receiptData.remainingBalance !== receiptData.total) && (
              <div className="flex justify-between text-sm font-bold text-red-600 mt-1">
                <span>Saldo a Pagar:</span>
                <span>{formatCurrency(receiptData.remainingBalance)}</span>
              </div>
            )}
          </div>

          {/* Legal Text & Footer */}
          <div className="text-center text-[10px] text-gray-600 leading-tight border-b border-gray-300 pb-4 mb-4">
            <p className="font-bold text-xs text-gray-800 mb-3">Gracias por su preferencia</p>
            <p className="mb-1">Este documento es un comprobante interno de venta generado por el sistema {receiptData.workshopName || 'MotoManager'} para control administrativo del taller.</p>
            <p className="mb-1">No constituye factura electrónica ni documento equivalente autorizado por la DIAN.</p>
            <p className="mb-1">No otorga derechos de deducción de impuestos ni soporta créditos fiscales.</p>
            <p className="mb-2">El valor aquí registrado corresponde a una transacción comercial interna entre las partes.</p>
            <p className="italic">"Documento generado automáticamente por {receiptData.workshopName || 'MotoManager'} — Sin validez tributaria."</p>
          </div>

          <div className="text-center text-[10px] text-gray-500 border-b border-gray-300 pb-2 mb-2">
            <p className="font-bold text-gray-700 m-0 mb-1">MotoManager - CRM</p>
            <p className="m-0">Created by - Mivra S.A.S</p>
          </div>

          <div className="text-center text-[10px] text-gray-500">
            <p className="m-0 mb-1">www.mivra.com.co</p>
            <p className="m-0 italic">MotoManager — Sin validez tributaria.</p>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          {receiptData.paymentMethod === 'Wompi' && (
            <WompiButton
              amountInCents={Math.round(receiptData.total * 100)}
              reference={`MM-SALE-${receiptData.saleNumber}`}
              customerEmail={(receiptData as any).customerEmail}
              redirectUrl={`${typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL || 'https://www.motomanager.com.co'}/sales?payment=success&sale=${(receiptData as any).id}`}
              buttonLabel="Pagar con Wompi"
            />
          )}
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