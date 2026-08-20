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
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { importCustomers } from '@/lib/actions/customers';

export function ImportCustomers() {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const { toast } = useToast();
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      readExcel(selectedFile);
    }
  };

  const readExcel = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(new Uint8Array(data), { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
        
        // Map to our expected format based on headers
        const mappedData = json.map((row: any) => {
          const rawBrandModel = row['Marca y Referencia Moto'] || '';
          const parts = String(rawBrandModel).trim().split(' ');
          const brand = parts[0] || '';
          const model = parts.length > 1 ? parts.slice(1).join(' ') : 'N/A';

          return {
            customerName: String(row['Nombre Cliente'] || ''),
            customerPhone: row['Numero Celular'] ? String(row['Numero Celular']) : undefined,
            motoBrand: brand,
            motoModel: model,
            motoPlate: String(row['Placa Moto'] || ''),
            customerCedula: row['Numero de Documento'] ? String(row['Numero de Documento']) : undefined,
            customerEmail: row['Dirección de correo electrónico'] ? String(row['Dirección de correo electrónico']) : undefined,
            motoYear: row['Modelo Moto'] ? Number(row['Modelo Moto']) : undefined,
          };
        }).filter(item => item.customerName && item.motoPlate); // Only keep valid rows

        setPreview(mappedData);
      } catch (err) {
        toast({
          title: "Error al leer el archivo",
          description: "Asegúrate de que es un archivo Excel válido con el formato correcto.",
          variant: "destructive"
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (preview.length === 0) return;
    setLoading(true);
    
    try {
      const result = await importCustomers(preview);
      
      if (result.success) {
        toast({
          title: "Importación completada",
          description: `Se importaron ${result.successCount} registros exitosamente.${result.errorCount > 0 ? ` Hubo ${result.errorCount} errores.` : ''}`,
          variant: result.errorCount > 0 ? "destructive" : "default"
        });
        if (result.errorCount > 0 && result.errors) {
            console.warn("Errores de importación:", result.errors);
        }
        setIsOpen(false);
        setFile(null);
        setPreview([]);
        router.refresh();
      }
    } catch (error: any) {
      toast({
        title: "Error en la importación",
        description: error.message || "Ocurrió un error inesperado.",
        variant: "destructive"
      });
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
          <DialogTitle className="text-foreground">Importar Clientes</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Sube un archivo Excel (.xlsx) con las columnas requeridas (Nombre Cliente, Placa Moto, etc).
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
              'Importar Registros'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
