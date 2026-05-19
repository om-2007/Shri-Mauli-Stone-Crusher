import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function normalizeVehicleNumber(vehicle: string): string {
  return (vehicle || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().trim();
}

export function normalizeComparableText(value: string): string {
  return (value || '').trim().replace(/\s+/g, ' ').toUpperCase();
}

export function resolveCanonicalText(input: string, candidates: string[]): string {
  const trimmed = (input || '').trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';

  const normalizedInput = normalizeComparableText(trimmed);
  const matched = candidates.find(candidate => normalizeComparableText(candidate) === normalizedInput);
  return matched ? matched.trim().replace(/\s+/g, ' ') : trimmed;
}

export const EXCLUDED_VEHICLES = [
  'MH-10-Z-4644', 'MH-10-Z-4635', 'MH-10-AW-7200', 'MH-10-AW-7236',
  'MH-10-AW-9954', 'MH-10-CR-4014', 'MH-10-CR-4023', 'MH-10-CB-0045',
  'MH-10-BF-3334', 'MH-10-BK-234', 'MH-10-CD-7803', 'MH-10-DM-567'
];
