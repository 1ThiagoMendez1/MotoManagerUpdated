import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Formats a given date string or Date object to a standard exact date and time format.
 * Format: dd/MM/yyyy hh:mm a (e.g., 25/08/2026 02:30 PM)
 * 
 * @param date - The date to format
 * @returns The formatted date string, or '-' if invalid
 */
export function formatExactDateTime(date: Date | string | null | undefined): string {
  if (!date) return '-';
  
  const parsedDate = typeof date === 'string' ? new Date(date) : date;
  
  if (!isValid(parsedDate)) return '-';

  return format(parsedDate, 'dd/MM/yyyy hh:mm a', { locale: es });
}

/**
 * Formats a given date string or Date object to a standard date format (without time).
 * Format: dd/MM/yyyy (e.g., 25/08/2026)
 * 
 * @param date - The date to format
 * @returns The formatted date string, or '-' if invalid
 */
export function formatDateOnly(date: Date | string | null | undefined): string {
  if (!date) return '-';
  
  const parsedDate = typeof date === 'string' ? new Date(date) : date;
  
  if (!isValid(parsedDate)) return '-';

  return format(parsedDate, 'dd/MM/yyyy', { locale: es });
}
