const STYLE: Record<string, { color: string; bg: string }> = {
  admin: { color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.14)' },
  user:  { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)' },
}

export function RoleBadge({ role }: { role: string }) {
  const s = STYLE[role] ?? STYLE.user
  return (
    <span className="role-badge" style={{ color: s.color, background: s.bg }}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  )
}
