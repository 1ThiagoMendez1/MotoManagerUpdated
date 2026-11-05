'use client';

import { useState, useTransition } from 'react';
import { Clock3, Plus, Save, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { setWorkshopBusinessHours } from '@/lib/actions/profile';
import {
  BusinessHours, Weekday, TimeSlot, WEEKDAYS,
  emptyBusinessHours, formatBusinessHours, parseBusinessHours,
} from '@/lib/business-hours';

export function BusinessHoursEditor({ initialHours }: { initialHours: BusinessHours | null }) {
  const [hours, setHours] = useState<BusinessHours>(initialHours || emptyBusinessHours());
  const [persisted, setPersisted] = useState<BusinessHours | null>(initialHours);
  const [saved, setSaved] = useState(initialHours !== null);
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const { toast } = useToast();

  function replaceDay(day: Weekday, slots: TimeSlot[]) {
    setHours(prev => ({ ...prev, [day]: slots }));
    setError('');
  }

  function addSlot(day: Weekday) {
    const old = hours[day];
    if (old.length >= 3) return;
    const proposed = old.length ? old[old.length - 1].close : '09:00';
    const endHour = Math.min(23, Number(proposed.slice(0, 2)) + 1);
    const suggestedEnd = old.length ? String(endHour).padStart(2, '0') + ':' + proposed.slice(3) : '18:00';
    replaceDay(day, [...old, { open: proposed, close: suggestedEnd }]);
  }

  function save() {
    const valid = parseBusinessHours(hours);
    if (!valid) {
      setError('Corrige las horas: cada cierre debe ser posterior a su apertura, sin intervalos superpuestos.');
      return;
    }
    startTransition(async () => {
      const result = await setWorkshopBusinessHours(valid);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSaved(true);
      setPersisted(valid);
      setEditing(false);
      toast({ title: 'Horarios guardados', description: 'Se usarán los horarios de este taller en las notificaciones compatibles.' });
    });
  }

  return (
    <section className="mt-6 bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-primary/5">
        <div>
          <h2 className="font-semibold text-sm flex items-center gap-2"><Clock3 className="w-4 h-4" /> Horarios de atención</h2>
          <p className="text-xs text-muted-foreground mt-1">Configura los días, descansos y horas de tu taller para WhatsApp.</p>
        </div>
        <button type="button" onClick={() => { if (editing) setHours(persisted || emptyBusinessHours()); setEditing(!editing); setError(''); }}
          className="text-sm border rounded-lg px-3 py-2 hover:bg-muted">
          {editing ? 'Cancelar edición' : 'Editar horarios'}
        </button>
      </div>
      <div className="p-5 space-y-4">
        {!saved && <p className="text-sm text-amber-700 dark:text-amber-300">
          Todavía no hay horarios configurados. No enviaremos horas predeterminadas.
        </p>}
        {editing ? (
          <>
            {WEEKDAYS.map(({ key, label }) => (
              <div key={key} className="border-b border-border/50 pb-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <input type="checkbox" checked={hours[key].length > 0}
                      onChange={event => event.target.checked ? addSlot(key) : replaceDay(key, [])} />
                    {label}
                  </label>
                  {hours[key].length > 0 && hours[key].length < 3 &&
                    <button type="button" onClick={() => addSlot(key)} className="text-xs flex items-center gap-1 text-primary">
                      <Plus className="w-3 h-3" /> Otra franja
                    </button>}
                </div>
                {hours[key].length === 0 && <p className="text-xs text-muted-foreground">Cerrado</p>}
                {hours[key].map((slot, index) => (
                  <div key={index} className="flex flex-wrap items-center gap-2">
                    <label className="text-xs">Desde
                      <input aria-label={label + ' apertura ' + (index + 1)} type="time" value={slot.open}
                        onChange={event => replaceDay(key, hours[key].map((s, j) => j === index ? { ...s, open: event.target.value } : s))}
                        className="ml-1 rounded-lg border bg-background px-2 py-1.5" />
                    </label>
                    <label className="text-xs">Hasta
                      <input aria-label={label + ' cierre ' + (index + 1)} type="time" value={slot.close}
                        onChange={event => replaceDay(key, hours[key].map((s, j) => j === index ? { ...s, close: event.target.value } : s))}
                        className="ml-1 rounded-lg border bg-background px-2 py-1.5" />
                    </label>
                    <button type="button" aria-label={'Quitar franja de ' + label}
                      onClick={() => replaceDay(key, hours[key].filter((_, j) => j !== index))}
                      className="p-2 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            ))}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <button type="button" disabled={pending} onClick={save}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 w-full disabled:opacity-60">
              <Save className="w-4 h-4" /> {pending ? 'Guardando horarios...' : 'Guardar horarios'}
            </button>
          </>
        ) : (
          <div>
            <p className="text-sm whitespace-pre-line">{saved ? formatBusinessHours(hours) : 'Sin configurar'}</p>
            <p className="mt-3 text-xs text-muted-foreground">
              Cada taller tiene su propio horario. Se recomienda mantenerlo actualizado para evitar que los clientes acudan cuando está cerrado.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
