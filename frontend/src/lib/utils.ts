import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Robustly parses date strings from the backend, supporting custom localization formats
 * like "YYYY-MM-DD - HH:mm:ss AM/PM" or "MM/DD/YYYY - ...".
 */
export function parseSystemDate(dateStr: string | null | undefined): Date {
  if (!dateStr) return new Date(NaN);

  // 1. Standard ISO Format check (already supported by new Date)
  // But we want to check for our custom " - " separator first.
  if (dateStr.includes(' - ')) {
    const match = dateStr.match(
      /^(\d{2,4})[/-](\d{2})[/-](\d{2,4})\s*-\s*(\d{2}):(\d{2}):(\d{2})\s*(AM|PM)?$/i
    );

    if (match) {
      const [, p1, p2, p3, hh, mm, ss, ampm] = match;
      let year: number, month: number, day: number;

      if (p1.length === 4) {
        // YYYY-MM-DD
        year = parseInt(p1, 10);
        month = parseInt(p2, 10) - 1;
        day = parseInt(p3, 10);
      } else {
        // MM/DD/YYYY or DD/MM/YYYY
        // Default to MM/DD/YYYY as per system default
        month = parseInt(p1, 10) - 1;
        day = parseInt(p2, 10);
        year = parseInt(p3, 10);

        // Basic heuristic: if month > 11, swap day and month
        if (month > 11) {
          [month, day] = [day - 1, month + 1];
        }
      }

      let hour = parseInt(hh, 10);
      if (ampm) {
        if (ampm.toUpperCase() === 'PM' && hour !== 12) hour += 12;
        if (ampm.toUpperCase() === 'AM' && hour === 12) hour = 0;
      }

      return new Date(year, month, day, hour, parseInt(mm, 10), parseInt(ss, 10));
    }
  }

  // 2. Fallback to native parsing
  return new Date(dateStr);
}

/**
 * Formats a date or date string into "DD Month YYYY" format.
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '';

  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  const day = d.getDate();
  const month = d.toLocaleString('default', { month: 'long' });
  const year = d.getFullYear();

  return `${day} ${month} ${year}`;
}
