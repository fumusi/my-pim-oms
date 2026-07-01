import type { LocalizedText } from '../api/categories'

export type Lang = 'nl' | 'en' | 'de'

export function resolveName(text: LocalizedText, lang: Lang): string {
  return text[lang] ?? text.nl ?? text.en ?? text.de ?? '—'
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`
}

export function getApiError(err: unknown): string {
  const e = err as { response?: { data?: { message?: string } } }
  return e?.response?.data?.message ?? 'Something went wrong'
}

export function calcEffectivePrice(customPrice: number, discount: number | null): number {
  if (discount == null) return customPrice
  return parseFloat((customPrice * (1 - discount / 100)).toFixed(4))
}
