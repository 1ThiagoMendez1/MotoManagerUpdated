import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatWhatsAppPhone(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('57')) return cleaned;
  if (cleaned.length === 10) return `57${cleaned}`;
  return cleaned;
}

export function getWhatsAppLink(phone: string, text?: string): string {
  const formatted = formatWhatsAppPhone(phone);
  if (!formatted) return '#';
  const query = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${formatted}${query}`;
}

