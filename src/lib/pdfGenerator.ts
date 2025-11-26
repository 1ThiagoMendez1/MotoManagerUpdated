import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface ReceiptData {
  saleNumber: string;
  date: string;
  customerName?: string;
  paymentMethod?: string;
  items: Array<{
    name: string;
    sku?: string;
    category?: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  laborCost?: number;
  subtotal?: number;
  discountPercentage?: number;
  discountAmount?: number;
  /** Total abonado previamente por el cliente para esta orden */
  depositAmount?: number;
  /** Saldo pendiente después de restar abonos */
  remainingBalance?: number;
  total: number;
  workOrderId?: string;
  motorcycleInfo?: {
    make: string;
    model: string;
    year: number;
    plate: string;
  };
  technicianName?: string;
}

export async function generateReceiptPDF(receiptData: ReceiptData): Promise<void> {
  // Crear un elemento HTML temporal para el recibo
  const receiptElement = document.createElement('div');
  receiptElement.innerHTML = generateReceiptHTML(receiptData);
  receiptElement.style.position = 'absolute';
  receiptElement.style.left = '-9999px';
  receiptElement.style.top = '-9999px';
  receiptElement.style.width = '400px';
  receiptElement.style.fontFamily = 'Arial, sans-serif';
  document.body.appendChild(receiptElement);

  try {
    // Convertir HTML a canvas
    const canvas = await html2canvas(receiptElement, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
    });

    // Crear PDF
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Calcular dimensiones para centrar la imagen
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
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

    // Descargar PDF
    pdf.save(`recibo-${receiptData.saleNumber}.pdf`);
  } finally {
    // Limpiar elemento temporal
    document.body.removeChild(receiptElement);
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
          <span>#${data.workOrderId}</span>
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
        ${data.paymentMethod ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span style="font-weight: bold;">Medio de Pago:</span>
          <span>${data.paymentMethod}</span>
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

      <!-- Deposit (Abono) -->
      ${data.depositAmount && data.depositAmount > 0 ? `
      <div style="margin-bottom: 5px;">
        <div style="display: flex; justify-content: space-between; color: #16a34a;">
          <span style="font-weight: bold;">Abono recibido:</span>
          <span>- ${formatCurrency(data.depositAmount)}</span>
        </div>
      </div>
      ` : ''}

      <!-- Remaining Balance -->
      ${data.remainingBalance && data.remainingBalance > 0 ? `
      <div style="margin-bottom: 10px; padding: 8px; background: #fef9c3; border-radius: 4px;">
        <div style="display: flex; justify-content: space-between;">
          <span style="font-weight: bold;">Saldo pendiente:</span>
          <span>${formatCurrency(data.remainingBalance)}</span>
        </div>
      </div>
      ` : ''}

      <!-- Total -->
      <div style="border-top: 2px solid #333; padding-top: 10px; margin-top: 20px;">
        <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold;">
          <span>TOTAL SERVICIO:</span>
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