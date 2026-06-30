function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '—'
  if (typeof val === 'object') return JSON.stringify(val, null, 0)
  return String(val)
}

const tdLabel: React.CSSProperties = {
  padding: '0.2rem 0.5rem 0.2rem 0',
  color: '#6b6e87',
  whiteSpace: 'nowrap',
  verticalAlign: 'top',
  fontFamily: 'monospace',
  fontSize: '0.8rem',
}

export function AuditDiff({
  changedFields,
}: {
  changedFields: Record<string, { old: unknown; new: unknown }> | null
}) {
  if (!changedFields || Object.keys(changedFields).length === 0) return null

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
      <tbody>
        {Object.entries(changedFields).map(([field, { old: oldVal, new: newVal }]) => (
          <tr key={field}>
            <td style={tdLabel}>{field}</td>
            <td style={{ padding: '0.2rem 0.5rem', verticalAlign: 'top' }}>
              <span style={{ textDecoration: 'line-through', color: 'var(--bs-secondary, #6b7280)' }}>
                {formatValue(oldVal)}
              </span>
            </td>
            <td style={{ padding: '0.2rem 0 0.2rem 0.5rem', verticalAlign: 'top' }}>
              <span style={{ color: 'var(--bs-success, #198754)', fontWeight: 500 }}>
                {formatValue(newVal)}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function AuditSnapshot({ snapshot }: { snapshot: Record<string, unknown> }) {
  const entries = Object.entries(snapshot).filter(([, v]) => v !== null && v !== undefined)
  if (entries.length === 0) return null

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
      <tbody>
        {entries.map(([field, val]) => (
          <tr key={field}>
            <td style={tdLabel}>{field}</td>
            <td style={{ padding: '0.2rem 0 0.2rem 0.5rem', verticalAlign: 'top', color: '#c5c7d8' }}>
              {formatValue(val)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
