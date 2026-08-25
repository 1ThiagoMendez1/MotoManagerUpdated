"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { importServicesBulk } from '@/actions/services';

export function ImportServices({ organizationId, onSuccess }: { organizationId: string; onSuccess: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      readExcel(selectedFile);
    }
  };

  const parseCurrencyString = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value.replace(/[^0-9.-]+/g, ""));
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const readExcel = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(new Uint8Array(data), { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        
        // Map to our expected format based on headers CÓDIGO, SERVICIO, VALOR
        const mappedData = json.map((row: any) => {
          // Fallback parsing keys by finding them case-insensitively
          const getVal = (possibleKeys: string[]) => {
             const key = Object.keys(row).find(k => possibleKeys.includes(k.toUpperCase().trim()));
             return key ? row[key] : "";
          };

          const rawCode = getVal(['CÓDIGO', 'CODIGO', 'CODE']);
          const rawService = getVal(['SERVICIO', 'NOMBRE', 'NAME']);
          const rawValue = getVal(['VALOR', 'PRECIO', 'PRICE']);

          const default_price = parseCurrencyString(rawValue);

          return {
            code: String(rawCode).trim() || undefined,
            name: String(rawService).trim(),
            default_price: default_price,
            category: "Taller Especializado"
          };
        }).filter(item => item.name); // Only keep valid rows

        setPreview(mappedData);
      } catch (err) {
        toast.error("Error al leer el archivo. Asegúrate de que es un archivo Excel válido con el formato correcto.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (preview.length === 0) return;
    setLoading(true);
    
    try {
      const result = await importServicesBulk(organizationId, preview);
      
      if (result.success) {
        toast.success(`Se importaron ${result.count} servicios exitosamente.`);
        setIsOpen(false);
        setFile(null);
        setPreview([]);
        onSuccess();
      } else {
        toast.error(result.error || "Ocurrió un error al importar.");
      }
    } catch (error: any) {
      toast.error(error.message || "Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) {
        setFile(null);
        setPreview([]);
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-500">
          <FileUp className="mr-2 h-4 w-4" />
          Importar Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground">Importar Servicios</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Sube un archivo Excel (.xlsx) con las columnas: CÓDIGO, SERVICIO, VALOR.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 border-muted-foreground/25 bg-muted/10">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <FileUp className="w-8 h-8 mb-3 text-muted-foreground" />
                <p className="mb-2 text-sm text-muted-foreground text-center">
                  <span className="font-semibold">Haz clic para subir</span> o arrastra y suelta<br/>el archivo Excel
                </p>
              </div>
              <input 
                type="file" 
                className="hidden" 
                accept=".xlsx, .xls" 
                onChange={handleFileChange} 
                onClick={(e) => { (e.target as HTMLInputElement).value = '' }}
              />
            </label>
          </div>
          
          {file && (
            <div className="text-sm font-medium text-foreground bg-muted/30 p-3 rounded-md flex justify-between items-center">
              <span>{file.name}</span>
              <span className="text-emerald-500 font-bold">{preview.length} válidos</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={!file || preview.length === 0 || loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importando...
              </>
            ) : (
              'Importar Servicios'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
