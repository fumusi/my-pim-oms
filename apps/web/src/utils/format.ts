import type { LocalizedText } from '../api/categories'

export type Lang = 'nl' | 'en' | 'de'

export function resolveName(text: LocalizedText, lang: Lang): string {
  return text[lang] ?? text.nl ?? text.en ?? text.de ?? '—'
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function getApiError(err: unknown): string {
  const e = err as { response?: { data?: { message?: string } } }
  return e?.response?.data?.message ?? 'Something went wrong'
}
