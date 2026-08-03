import type { Lang } from '../i18n';

export function formatDate(date: Date, lang: Lang = 'en'): string {
  return date.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
