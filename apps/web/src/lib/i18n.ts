export type AppLocale = 'vi' | 'en';

const VIETNAMESE_TIME_ZONES = new Set([
  'Asia/Ho_Chi_Minh',
]);

export function detectAppLocale(timeZone?: string | null): AppLocale {
  if (!timeZone) {
    return 'vi';
  }

  return VIETNAMESE_TIME_ZONES.has(timeZone) ? 'vi' : 'en';
}

export function detectBrowserLocale(): AppLocale {
  if (typeof window === 'undefined') {
    return 'vi';
  }

  return detectAppLocale(Intl.DateTimeFormat().resolvedOptions().timeZone);
}

export function formatAppDate(value: string | number | Date, locale: AppLocale) {
  return new Date(value).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatAppDateTime(value: string | number | Date, locale: AppLocale) {
  return new Date(value).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US', {
    hour12: false,
  });
}

export function formatAppNumber(value: number, locale: AppLocale) {
  return new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US').format(value);
}

export function formatAppCurrency(value: number, locale: AppLocale) {
  return new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}
