import { z } from 'zod';

export const dashboardSummarySchema = z.object({
  ingresosMes: z.number(), motosEnTallerCount: z.number(),
  activeWorkOrdersCount: z.number(), stockCriticoCount: z.number(),
  revenueData: z.array(z.object({ date: z.string(), ingresos: z.number(), gastos: z.number() })),
  incomeByMethodData: z.array(z.object({ method: z.string().nullable(), amount: z.number() })),
  topPartsData: z.array(z.object({ name: z.string(), ventas: z.number() })),
});

export function formatDashboardSummary(summary: z.infer<typeof dashboardSummarySchema>) {
  const labels: Record<string, string> = {
    cash: 'Efectivo', credit_card: 'Tarjeta de Crédito', debit_card: 'Tarjeta de Débito',
    transfer: 'Transferencia Bancaria', nequi: 'Nequi', daviplata: 'DaviPlata', wompi: 'Wompi', other: 'Otro',
  };
  const alerts: { text: string; time: string; urgent: boolean; link?: string }[] = [];
  if (summary.stockCriticoCount > 0) alerts.push({ text: `Hay ${summary.stockCriticoCount} repuesto(s) con stock crítico.`, time: 'Reciente', urgent: true, link: '/inventory' });
  if (summary.activeWorkOrdersCount > 0) alerts.push({ text: `Tienes ${summary.activeWorkOrdersCount} orden(es) activa(s) en proceso.`, time: 'Reciente', urgent: false, link: '/work-orders' });
  if (!alerts.length) alerts.push({ text: 'Todo está al día en tu taller.', time: 'Ahora', urgent: false });
  return {
    ...summary, alerts,
    revenueData: summary.revenueData.map(({ date, ...day }) => ({
      ...day, name: new Date(`${date}T12:00:00-05:00`).toLocaleDateString('es-CO', { weekday: 'short', timeZone: 'America/Bogota' }),
    })),
    incomeByMethodData: summary.incomeByMethodData.map(({ method, amount }) => ({ name: labels[method || ''] || method || 'Otros', amount })),
  };
}
