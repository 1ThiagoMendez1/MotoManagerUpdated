'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createService, updateService, deleteService, ServiceItem } from '@/actions/services';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface ServiceFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  initialData?: ServiceItem | null;
  onSuccess: () => void;
}

export default function ServiceFormModal({ open, onOpenChange, organizationId, initialData, onSuccess }: ServiceFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    if (open) {
      if (initialData) {
        setName(initialData.name);
        setDescription(initialData.description || '');
        setPrice(initialData.default_price.toString());
        setDuration(initialData.default_duration_minutes ? initialData.default_duration_minutes.toString() : '');
        setCategory(initialData.category || '');
      } else {
        setName('');
        setDescription('');
        setPrice('');
        setDuration('');
        setCategory('');
      }
    }
  }, [open, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }

    setLoading(true);
    const payload = {
      name,
      description,
      default_price: Number(price) || 0,
      default_duration_minutes: duration ? Number(duration) : undefined,
      category: category.trim() || undefined
    };

    try {
      if (initialData) {
        const res = await updateService(initialData.id, organizationId, payload);
        if (res.success) {
          toast.success('Servicio actualizado');
          onSuccess();
        } else {
          toast.error(res.error || 'Error al actualizar');
        }
      } else {
        const res = await createService(organizationId, payload);
        if (res.success) {
          toast.success('Servicio creado exitosamente');
          onSuccess();
        } else {
          toast.error(res.error || 'Error al crear');
        }
      }
    } catch (error) {
      toast.error('Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData) return;
    if (!confirm('¿Estás seguro de que deseas eliminar este servicio?')) return;
    
    setDeleting(true);
    try {
      const res = await deleteService(initialData.id, organizationId);
      if (res.success) {
        toast.success('Servicio eliminado');
        onSuccess();
      } else {
        toast.error(res.error || 'Error al eliminar');
      }
    } catch (error) {
      toast.error('Ocurrió un error inesperado');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] bg-background border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Servicio' : 'Nuevo Servicio'}</DialogTitle>
          <DialogDescription>
            {initialData ? 'Modifica los datos del servicio.' : 'Agrega un nuevo servicio al catálogo de tu taller.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nombre del servicio <span className="text-destructive">*</span></label>
            <Input 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Sincronización general"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Categoría (Ventas)</label>
            <Input 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ej. Taller Especializado, Lavado..."
            />
            <p className="text-xs text-muted-foreground">Esta categoría agrupará los ingresos en Contabilidad.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Precio Base ($)</label>
              <Input 
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Duración (min)</label>
              <Input 
                type="number"
                min="0"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="Ej. 60"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Descripción (Opcional)</label>
            <textarea 
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm min-h-[80px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles del servicio..."
            />
          </div>

          <div className="flex items-center justify-between pt-4">
            {initialData ? (
              <Button 
                type="button" 
                variant="destructive" 
                onClick={handleDelete}
                disabled={loading || deleting}
                className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading || deleting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || deleting} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {initialData ? 'Guardar Cambios' : 'Crear Servicio'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
