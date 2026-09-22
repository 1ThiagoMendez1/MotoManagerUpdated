'use client';

import { useState } from 'react';
import type { Customer } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { CustomerDetails } from '@/components/details/CustomerDetails';
import { EditCustomer } from '@/components/forms/EditCustomer';
import { DeleteCustomer } from '@/components/forms/DeleteCustomer';
import { Pagination } from '@/components/Pagination';
import { bulkDeleteCustomers } from '@/lib/actions/customers';
import { toast } from 'sonner';

export function CustomerTable({
  customers,
  totalPages
}: {
  customers: Customer[];
  totalPages: number;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(customers.map((c) => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (checked: boolean, id: string) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    const confirm = window.confirm(`¿Estás seguro de que deseas eliminar ${selectedIds.length} cliente(s)? Esta acción no se puede deshacer.`);
    if (!confirm) return;

    setIsDeleting(true);
    try {
      const res = await bulkDeleteCustomers(selectedIds);
      if (res?.message) {
        toast.error(res.message);
      } else {
        toast.success(`Se eliminaron ${selectedIds.length} clientes correctamente.`);
        setSelectedIds([]);
      }
    } catch (error) {
      toast.error('Error al eliminar los clientes.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {selectedIds.length > 0 && (
        <div className="bg-muted/50 border border-border rounded-lg p-2.5 mb-4 flex items-center justify-between animate-in fade-in slide-in-from-top-4">
          <span className="text-sm font-medium text-foreground ml-2">
            {selectedIds.length} cliente(s) seleccionado(s)
          </span>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={handleBulkDelete}
            disabled={isDeleting}
            className="h-8"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {isDeleting ? 'Eliminando...' : 'Eliminar seleccionados'}
          </Button>
        </div>
      )}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60 hover:bg-transparent bg-muted/20">
              <TableHead className="w-[40px] pl-4">
                <Checkbox
                  checked={customers.length > 0 && selectedIds.length === customers.length}
                  onCheckedChange={handleSelectAll}
                  aria-label="Seleccionar todos"
                />
              </TableHead>
              <TableHead className="text-foreground font-semibold text-xs uppercase tracking-wider py-3">Nombre</TableHead>
              <TableHead className="text-foreground font-semibold text-xs uppercase tracking-wider py-3">Email</TableHead>
              <TableHead className="hidden md:table-cell text-foreground font-semibold text-xs uppercase tracking-wider py-3">Teléfono</TableHead>
              <TableHead className="hidden lg:table-cell text-foreground font-semibold text-xs uppercase tracking-wider py-3">Cédula / NIT</TableHead>
              <TableHead className="text-center text-foreground font-semibold text-xs uppercase tracking-wider py-3">Tipo</TableHead>
              <TableHead className="text-right text-foreground font-semibold text-xs uppercase tracking-wider py-3 pr-4">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                  No se encontraron clientes con este criterio.
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => (
                <TableRow key={customer.id} className="border-border/50 hover:bg-muted/30 transition-colors">
                  <TableCell className="pl-4">
                    <Checkbox
                      checked={selectedIds.includes(customer.id)}
                      onCheckedChange={(checked) => handleSelectOne(checked as boolean, customer.id)}
                      aria-label={`Seleccionar a ${customer.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-semibold text-foreground text-sm py-2.5">
                    {customer.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs py-2.5">
                    {customer.email || '—'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-foreground font-medium text-xs py-2.5">
                    {customer.phone || '—'}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground font-mono text-xs py-2.5">
                    {customer.cedula || '—'}
                  </TableCell>
                  <TableCell className="text-center py-2.5">
                    {customer.isFrequent ? (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-semibold py-0.5">
                        Frecuente
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-muted text-muted-foreground border-border/50 text-[10px] font-medium py-0.5">
                        Regular
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right py-2.5 pr-4">
                    <div className="flex gap-1 justify-end items-center">
                      <CustomerDetails customer={customer} />
                      <EditCustomer customer={customer} />
                      <DeleteCustomer customer={customer} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="p-3 border-t border-border/50 flex justify-center bg-muted/10">
          <Pagination totalPages={totalPages} />
        </div>
      )}
    </>
  );
}
