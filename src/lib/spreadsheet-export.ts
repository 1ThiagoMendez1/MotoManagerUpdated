'use client';

import { toast } from 'sonner';

// XLSX is a large optional dependency: load it only when an export is requested.
export async function exportSpreadsheet(write: (xlsx: typeof import('xlsx')) => void | Promise<void>) {
  try {
    const xlsx = await import('xlsx');
    await write(xlsx);
  } catch {
    toast.error('No se pudo generar el archivo. Comprueba tu conexión e intenta de nuevo.');
  }
}
