import type { ReactNode } from 'react'

// ── Icons ─────────────────────────────────────────────────────────────────────

function BoxIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  )
}

function ClipboardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="16" x2="13" y2="16" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function ArrowUp() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  )
}

function ArrowDown() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  )
}

// ── Data ──────────────────────────────────────────────────────────────────────

interface StatCardData {
  label: string
  value: string
  trend: string
  trendUp: boolean
  trendNote: string
  accentColor: string
  accentBg: string
  icon: ReactNode
}

const STATS: StatCardData[] = [
  {
    label: 'Total Products',
    value: '1,284',
    trend: '+8.2%',
    trendUp: true,
    trendNote: 'vs last month',
    accentColor: '#7c3aed',
    accentBg: 'rgba(124, 58, 237, 0.14)',
    icon: <BoxIcon />,
  },
  {
    label: 'Total Orders',
    value: '348',
    trend: '+14.5%',
    trendUp: true,
    trendNote: 'vs last month',
    accentColor: '#3b82f6',
    accentBg: 'rgba(59, 130, 246, 0.14)',
    icon: <ClipboardIcon />,
  },
  {
    label: 'Active Users',
    value: '92',
    trend: '+3.1%',
    trendUp: true,
    trendNote: 'vs last month',
    accentColor: '#10b981',
    accentBg: 'rgba(16, 185, 129, 0.14)',
    icon: <UsersIcon />,
  },
  {
    label: 'Low Stock Items',
    value: '17',
    trend: '+5',
    trendUp: false,
    trendNote: 'since yesterday',
    accentColor: '#f59e0b',
    accentBg: 'rgba(245, 158, 11, 0.14)',
    icon: <AlertIcon />,
  },
]

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  Delivered:  { color: '#34d399', bg: 'rgba(52, 211, 153, 0.12)' },
  Shipped:    { color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.12)' },
  Processing: { color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.12)' },
  Pending:    { color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.12)' },
}

const RECENT_ORDERS = [
  { id: '#ORD-0348', customer: 'Alice Johnson', status: 'Shipped',    amount: '$142.00', date: 'Jun 17' },
  { id: '#ORD-0347', customer: 'Bob Smith',     status: 'Processing', amount: '$89.99',  date: 'Jun 17' },
  { id: '#ORD-0346', customer: 'Carol White',   status: 'Delivered',  amount: '$264.50', date: 'Jun 16' },
  { id: '#ORD-0345', customer: 'David Brown',   status: 'Pending',    amount: '$38.00',  date: 'Jun 16' },
  { id: '#ORD-0344', customer: 'Eva Green',     status: 'Shipped',    amount: '$195.00', date: 'Jun 15' },
]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// ── Components ────────────────────────────────────────────────────────────────

function StatCard({ label, value, trend, trendUp, trendNote, accentColor, accentBg, icon }: StatCardData) {
  return (
    <div className="dash-stat-card">
      <div className="dash-stat-top">
        <div className="dash-stat-icon" style={{ color: accentColor, background: accentBg }}>
          {icon}
        </div>
        <div className={`dash-stat-trend${trendUp ? '' : ' dash-stat-trend--down'}`}>
          {trendUp ? <ArrowUp /> : <ArrowDown />}
          {trend}
        </div>
      </div>
      <div className="dash-stat-value">{value}</div>
      <div className="dash-stat-label">{label}</div>
      <div className="dash-stat-note">{trendNote}</div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  return (
    <div>
      {/* Stat cards */}
      <div className="row g-3 mb-4">
        {STATS.map((s) => (
          <div key={s.label} className="col-6 col-xl-3">
            <StatCard {...s} />
          </div>
        ))}
      </div>

      {/* Content row */}
      <div className="row g-3">
        {/* Revenue chart */}
        <div className="col-12 col-xl-8">
          <div className="dash-card">
            <div className="dash-card-header">
              <div>
                <div className="dash-card-title">Revenue Overview</div>
                <div className="dash-card-sub">Monthly revenue — last 12 months</div>
              </div>
              <span className="dash-badge-pill">Placeholder</span>
            </div>

            <div className="dash-chart-area">
              <svg
                viewBox="0 0 600 160"
                preserveAspectRatio="none"
                className="dash-chart-svg"
                aria-label="Revenue overview chart placeholder"
              >
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[40, 80, 120].map((y) => (
                  <line key={y} x1="0" y1={y} x2="600" y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                ))}
                <path
                  d="M0,135 C50,125 80,75 120,62 S195,92 240,78 S315,32 360,42 S435,82 480,67 S555,47 600,28 L600,160 L0,160 Z"
                  fill="url(#chartGrad)"
                />
                <path
                  d="M0,135 C50,125 80,75 120,62 S195,92 240,78 S315,32 360,42 S435,82 480,67 S555,47 600,28"
                  fill="none"
                  stroke="#7c3aed"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                {([[120,62],[240,78],[360,42],[480,67],[600,28]] as [number,number][]).map(([cx, cy]) => (
                  <circle key={cx} cx={cx} cy={cy} r="3.5" fill="#7c3aed" />
                ))}
              </svg>

              <div className="dash-chart-labels">
                {MONTHS.map((m) => (
                  <span key={m}>{m}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recent orders */}
        <div className="col-12 col-xl-4">
          <div className="dash-card h-100">
            <div className="dash-card-header">
              <div>
                <div className="dash-card-title">Recent Orders</div>
                <div className="dash-card-sub">Last 5 orders</div>
              </div>
            </div>

            <div className="dash-order-list">
              {RECENT_ORDERS.map((o) => {
                const s = STATUS_STYLE[o.status] ?? STATUS_STYLE.Pending
                return (
                  <div key={o.id} className="dash-order-row">
                    <div className="dash-order-info">
                      <span className="dash-order-id">{o.id}</span>
                      <span className="dash-order-customer">{o.customer}</span>
                    </div>
                    <div className="dash-order-right">
                      <span className="dash-order-badge" style={{ color: s.color, background: s.bg }}>
                        {o.status}
                      </span>
                      <span className="dash-order-amount">{o.amount}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
