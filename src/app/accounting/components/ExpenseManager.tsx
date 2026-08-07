'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Receipt, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { addExpense, getExpenses } from '@/actions/accounting';

interface ExpenseManagerProps {
  organizationId: string;
}

const CATEGORIES = [
  'Facturas y Compras',
  'Nómina y Mano de Obra',
  'Servicios Públicos',
  'Insumos Taller',
  'Alimentación / Tintos',
  'Transporte',
  'Otros Gastos'
];

export default function ExpenseManager({ organizationId }: ExpenseManagerProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month'>('today');

  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const loadExpenses = async () => {
    setLoading(true);
    const now = new Date();
    let startDate: string | undefined;
    
    if (dateFilter === 'today') {
      const today = new Date(now.setHours(0, 0, 0, 0));
      startDate = today.toISOString();
    } else if (dateFilter === 'week') {
      const lastWeek = new Date(now.setDate(now.getDate() - 7));
      startDate = lastWeek.toISOString();
    } else if (dateFilter === 'month') {
      const lastMonth = new Date(now.setMonth(now.getMonth() - 1));
      startDate = lastMonth.toISOString();
    }

    try {
      const data = await getExpenses(organizationId, startDate);
      setExpenses(data);
    } catch (error) {
      toast.error('Error al cargar gastos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [organizationId, dateFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || Number(amount) <= 0) {
      toast.error('Por favor ingresa una descripción y un monto válido.');
      return;
    }

    setSubmitting(true);
    try {
      const expenseDate = new Date(date).toISOString();
      await addExpense(organizationId, category, description, Number(amount), expenseDate);
      toast.success('Gasto registrado con éxito');
      setDescription('');
      setAmount('');
      loadExpenses();
    } catch (error) {
      toast.error('No se pudo registrar el gasto.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Formulario */}
      <Card className="bg-card border-border/50 lg:col-span-1 h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="w-5 h-5 text-indigo-500" />
            Registrar Gasto
          </CardTitle>
          <CardDescription>
            Agrega un nuevo gasto a la contabilidad
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date">Fecha</Label>
              <Input 
                id="date" 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                className="bg-background"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Input 
                id="description" 
                placeholder="Ej. Compra de repuestos, Pago a Juan, Tintos..." 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                className="bg-background"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Monto ($)</Label>
              <Input 
                id="amount" 
                type="number" 
                placeholder="Ej. 150000" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)} 
                className="bg-background"
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white mt-2"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {submitting ? 'Registrando...' : 'Registrar Gasto'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Historial de Gastos */}
      <Card className="bg-card border-border/50 lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg">Historial de Gastos</CardTitle>
            <CardDescription>Desglose de los egresos registrados</CardDescription>
          </div>
          <Select value={dateFilter} onValueChange={(v: any) => setDateFilter(v)}>
            <SelectTrigger className="w-[140px] bg-background">
              <SelectValue placeholder="Filtro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="week">Última Semana</SelectItem>
              <SelectItem value="month">Este Mes</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-background/50 rounded-xl border border-border/50 border-dashed">
              <Receipt className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>No hay gastos registrados en este periodo.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {expenses.map((expense) => (
                <div key={expense.id} className="flex justify-between items-center p-3 sm:p-4 rounded-xl bg-background/50 border border-border/50 hover:bg-white/5 transition-colors">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="hidden sm:flex w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 items-center justify-center shrink-0">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{expense.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span className="bg-white/5 px-2 py-0.5 rounded-full">{expense.category}</span>
                        <span>•</span>
                        <span>{new Date(expense.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="font-bold text-rose-500">-{formatCurrency(expense.amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
