/** Horarios independientes por taller, sin valores predeterminados para notificaciones. */
export const WEEKDAYS = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
] as const;

export type Weekday = (typeof WEEKDAYS)[number]['key'];
export type TimeSlot = { open: string; close: string };
export type BusinessHours = Record<Weekday, TimeSlot[]>;

const timePattern = /^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/;
const isObject = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === 'object' && !Array.isArray(x);

export function parseBusinessHours(raw: unknown): BusinessHours | null {
  if (!isObject(raw) || Object.keys(raw).length !== WEEKDAYS.length) return null;
  const result = {} as BusinessHours;
  for (const { key } of WEEKDAYS) {
    const day = raw[key];
    if (!Array.isArray(day) || day.length > 3) return null;
    let previousClose = '';
    const ranges: TimeSlot[] = [];
    for (const slot of day) {
      if (!isObject(slot) || Object.keys(slot).length !== 2 ||
          typeof slot.open !== 'string' || typeof slot.close !== 'string' ||
          !timePattern.test(slot.open) || !timePattern.test(slot.close) ||
          slot.open >= slot.close || (previousClose && slot.open < previousClose)) return null;
      ranges.push({ open: slot.open, close: slot.close });
      previousClose = slot.close;
    }
    result[key] = ranges;
  }
  return result;
}

export function emptyBusinessHours(): BusinessHours {
  return { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] };
}

function displayTime(value: string): string {
  const [hourString, minute] = value.split(':');
  const hour = Number(hourString);
  const twelveHour = hour % 12 || 12;
  return String(twelveHour) + ':' + minute + (hour < 12 ? ' a. m.' : ' p. m.');
}

export function formatBusinessHours(raw: unknown): string {
  const hours = parseBusinessHours(raw);
  if (!hours) return 'Horario no configurado. Consulta directamente con el taller antes de visitarlo.';
  const lines: string[] = [];
  for (let i = 0; i < WEEKDAYS.length;) {
    const start = i;
    const signature = JSON.stringify(hours[WEEKDAYS[i].key]);
    while (i + 1 < WEEKDAYS.length && JSON.stringify(hours[WEEKDAYS[i + 1].key]) === signature) i++;
    const label = start === i ? WEEKDAYS[start].label :
      WEEKDAYS[start].label + ' a ' + WEEKDAYS[i].label.toLowerCase();
    const slots = hours[WEEKDAYS[start].key];
    lines.push(label + ': ' + (slots.length === 0 ? 'Cerrado' :
      slots.map(s => displayTime(s.open) + ' a ' + displayTime(s.close)).join(' y ')));
    i++;
  }
  return lines.join('\n');
}
