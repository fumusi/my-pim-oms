// Handles both OData /Date(ms)/ format and ISO strings from Exact Online API
export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const odataMatch = value.match(/\/Date\((-?\d+)(?:[+-]\d{4})?\)\//);
  if (odataMatch) return new Date(parseInt(odataMatch[1], 10));
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}
