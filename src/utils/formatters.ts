/**
 * Formatter utilities
 * Currency, time, distance, phone number
 */

import { format, formatDistanceToNow } from 'date-fns';

export const formatCurrency = (
  amount: number,
  currency: string = 'INR',
): string => {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `₹${amount}`;
  }
};
export const formatCurrency2 = (
  amount: number,
  currency: string = 'INR',
): string => {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `₹${amount}`;
  }
};

export const formatDistance = (km: number): string => {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
};

export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
};

export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return phone;
};

export const formatDate = (date: string | Date, fmt = 'dd MMM yyyy'): string => {
  try {
    return format(new Date(date), fmt);
  } catch {
    return String(date);
  }
};
export const formatDateTime = (date: string | Date, fmt = 'dd MMM yyyy hh:mm a'): string => {
  try {
    return format(new Date(date), fmt);
  } catch {
    return String(date);
  }
};

export const formateDateMonthYear = (date?: string | Date | null, fmt = 'MMMM yyyy'): string => {
  if (!date) return '—';
  try {
    return format(new Date(date), fmt).toUpperCase();
  } catch {
    return String(date).toUpperCase();
  }
};

export const formatRelativeTime = (date: string | Date): string => {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return '';
  }
};

export const formatRating = (rating: number): string =>
  rating.toFixed(1);

export const maskPhone = (phone: string): string => {
  if (phone.length < 6) return phone;
  return `${phone.slice(0, 2)}${'*'.repeat(phone.length - 4)}${phone.slice(-2)}`;
};


export const getRelativeTime = (dateString?: string) => {
  if (!dateString) return 'N/A';
  const now = new Date();
  const created = new Date(dateString);
  const diffMs = now.getTime() - created.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours <= 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return diffMins <= 1 ? 'Just now' : `${diffMins} mins ago`;
    }
    return `${diffHours} hours ago`;
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }
  const months = Math.floor(diffDays / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
};