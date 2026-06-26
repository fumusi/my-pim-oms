import { useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useSelector } from 'react-redux'
import { Link, useNavigate } from '@tanstack/react-router'
import type { RootState } from '../store'
import { getExactStatus, getExactAuthorizeUrl, startExactSync, getExactSyncStatus } from '../api/exact'
import { getPimProducts } from '../api/pim-products'
import { getUsers } from '../api/admin'
import { getOrders, getOrdersRevenue, type RevenueSummary } from '../api/orders'
import { formatDate } from '../utils/format'

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

// ── Stat card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: string | null
  note: string
  accentColor: string
  accentBg: string
  icon: React.ReactNode
  loading?: boolean
  href?: string
  search?: Record<string, unknown>
}

function StatCard({ label, value, note, accentColor, accentBg, icon, loading, href, search }: StatCardProps) {
  const inner = (
    <>
      <div className="dash-stat-top">
        <div className="dash-stat-icon" style={{ color: accentColor, background: accentBg }}>
          {icon}
        </div>
      </div>
      <div className="dash-stat-value">
        {loading ? (
          <span className="spinner-border spinner-border-sm" style={{ width: '16px', height: '16px', borderWidth: '2px', color: accentColor }} role="status" />
        ) : (
          value ?? <span style={{ color: '#4e5068', fontSize: '1.1rem' }}>No data</span>
        )}
      </div>
      <div className="dash-stat-label">{label}</div>
      <div className="dash-stat-note">{note}</div>
    </>
  )

  if (href) {
    return (
      <Link to={href} search={search as any} style={{ textDecoration: 'none' }}>
        <div className="dash-stat-card dash-stat-card--link">{inner}</div>
      </Link>
    )
  }

  return <div className="dash-stat-card">{inner}</div>
}

// ── Empty state ───────────────────────────────────────────────────────────────

function NoData({ message = 'No data available yet' }: { message?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '2.5rem 1rem', color: '#4e5068' }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span style={{ fontSize: '0.825rem' }}>{message}</span>
    </div>
  )
}

// ── Exact Online section ───────────────────────────────────────────────────────

function ExactOnlineSection() {
  const user = useSelector((s: RootState) => s.auth.user)
  const isAdmin = user?.role === 'admin'
  const queryClient = useQueryClient()
  const prevSyncStatus = useRef<string | undefined>(undefined)

  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ['exact-status'],
    queryFn: () => getExactStatus().then((r) => r.data),
    enabled: isAdmin,
    staleTime: 15_000,
  })

  const { data: jobStatus } = useQuery({
    queryKey: ['sync-job-status'],
    queryFn: () => getExactSyncStatus().then((r) => r.data),
    enabled: isAdmin,
    refetchInterval: (query) =>
      query.state.data?.status === 'running' ? 1500 : false,
  })

  useEffect(() => {
    const prev = prevSyncStatus.current
    prevSyncStatus.current = jobStatus?.status
    if (prev !== 'running') return

    if (jobStatus?.status === 'done') {
      toast.success(
        `Synced ${jobStatus.result.synced} products — ${jobStatus.result.created} created, ${jobStatus.result.updated} updated`,
      )
      void queryClient.invalidateQueries({ queryKey: ['products'] })
      void queryClient.invalidateQueries({ queryKey: ['product-count'] })
    } else if (jobStatus?.status === 'error') {
      toast.error(`Sync failed: ${jobStatus.error}`)
    }
  }, [jobStatus?.status, queryClient])

  const syncMutation = useMutation({
    mutationFn: () => startExactSync().then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sync-job-status'] })
    },
    onError: () => toast.error('Could not start sync. Check the connection and try again.'),
  })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('exact_connected') === '1') {
      toast.success('Exact Online connected successfully')
    } else if (params.get('exact_error') === 'missing_code') {
      toast.error('Exact Online authorization failed: no code received')
    } else if (params.get('exact_error') === 'invalid_state') {
      toast.error('Exact Online authorization failed: invalid or expired state — please try again')
    }
    if (params.has('exact_connected') || params.has('exact_error')) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  async function handleConnect() {
    try {
      const { data } = await getExactAuthorizeUrl()
      window.location.href = data.url
    } catch {
      toast.error('Could not get authorization URL')
    }
  }

  if (!isAdmin) return null

  const connected = statusData?.status === 'connected'
  const broken = statusData?.status === 'unauthorized'
  const canConnect = !connected || broken

  return (
    <div className="row g-3 mt-0 mb-0">
      <div className="col-12">
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <div className="dash-card-title">Exact Online Integration</div>
              <div className="dash-card-sub">
                {statusLoading
                  ? 'Checking connection…'
                  : connected
                  ? 'Connected and ready to sync'
                  : broken
                  ? 'Token expired — reconnect to restore access'
                  : 'Not connected'}
              </div>
            </div>

            {!statusLoading && (
              <div className="exact-status-badge-wrap">
                <span
                  className="exact-status-dot"
                  style={{
                    background: connected ? '#34d399' : broken ? '#f59e0b' : '#4e5068',
                  }}
                />
                <span
                  className="exact-status-label"
                  style={{
                    color: connected ? '#34d399' : broken ? '#f59e0b' : '#6b6e83',
                  }}
                >
                  {connected ? 'Connected' : broken ? 'Token expired' : 'Disconnected'}
                </span>
              </div>
            )}
          </div>

          <div className="exact-actions">
            <button
              className="exact-btn exact-btn-outline"
              disabled={!canConnect}
              onClick={handleConnect}
            >
              {connected ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Connected
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  {broken ? 'Reconnect to Exact' : 'Connect to Exact'}
                </>
              )}
            </button>

            <button
              className="exact-btn exact-btn-primary"
              disabled={!connected || syncMutation.isPending || jobStatus?.status === 'running'}
              onClick={() => syncMutation.mutate()}
            >
              {syncMutation.isPending || jobStatus?.status === 'running' ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm"
                    role="status"
                    aria-hidden="true"
                    style={{ width: '12px', height: '12px', borderWidth: '2px' }}
                  />
                  Syncing…
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                  Sync Products
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Buyer dashboard ───────────────────────────────────────────────────────────

function BuyerOrdersDashboard() {
  const user = useSelector((s: RootState) => s.auth.user)
  const navigate = useNavigate()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['orders', 'buyer'],
    queryFn: () => getOrders({}).then((r) => r.data),
  })

  const orders = data?.data ?? []

  return (
    <div className="row g-3 mb-4">
      <div className="col-12">
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <div className="dash-card-title">My Orders</div>
              <div className="dash-card-sub">
                {data ? `${data.total} order${data.total === 1 ? '' : 's'}` : 'Loading…'}
              </div>
            </div>
            <button
              className="exact-btn exact-btn-primary"
              onClick={() => navigate({ to: '/orders/new' })}
            >
              + New Order
            </button>
          </div>

          {isLoading && !data && (
            <div className="profile-loading">
              <div className="spinner-border" style={{ color: '#7c3aed' }} role="status" />
            </div>
          )}

          {isError && (
            <div className="profile-loading">
              <p style={{ color: '#f87171' }}>Failed to load orders.</p>
            </div>
          )}

          {!isLoading && !isError && orders.length === 0 && (
            <NoData message="You haven't placed any orders yet" />
          )}

          {!isError && orders.length > 0 && (
            <div className="users-table-wrap">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Status</th>
                    <th>Delivery</th>
                    <th>Total incl. VAT</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr
                      key={o.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate({ to: '/orders/$id', params: { id: String(o.id) } })}
                    >
                      <td className="users-td-muted" style={{ fontSize: '0.78rem' }}>
                        {o.orderNumber}
                      </td>
                      <td>
                        <span className={`order-status-badge order-status-${o.status}`}>
                          {o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                        </span>
                      </td>
                      <td className="users-td-muted">
                        {o.deliveryOption.charAt(0).toUpperCase() + o.deliveryOption.slice(1)}
                      </td>
                      <td className="users-td-muted">
                        {o.totalInclVat != null ? '€' + o.totalInclVat.toFixed(2) : '—'}
                      </td>
                      <td className="users-td-muted">{formatDate(o.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const user = useSelector((s: RootState) => s.auth.user)
  const isAdmin = user?.role === 'admin'
  const navigate = useNavigate()

  const { data: productsPage, isLoading: productsLoading } = useQuery({
    queryKey: ['product-count'],
    queryFn: () => getPimProducts({ page: 1, limit: 1 }).then((r) => r.data),
  })

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users-count'],
    queryFn: () => getUsers(1, 1).then((r) => r.data),
    enabled: isAdmin,
  })

  const { data: lowStockData, isLoading: lowStockLoading } = useQuery({
    queryKey: ['pim-products-low-stock-count'],
    queryFn: () => getPimProducts({ page: 1, limit: 1, inStock: 'low_stock' }).then((r) => r.data),
  })

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders-count'],
    queryFn: () => getOrders({ page: 1, limit: 1 }).then((r) => r.data),
    enabled: isAdmin,
  })

  const { data: recentOrders, isLoading: recentOrdersLoading } = useQuery({
    queryKey: ['recent-orders'],
    queryFn: () => getOrders({ page: 1, limit: 5 }).then((r) => r.data),
    enabled: isAdmin,
    staleTime: 30_000,
  })

  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ['orders-revenue'],
    queryFn: () => getOrdersRevenue().then((r) => r.data),
    enabled: isAdmin,
    staleTime: 60_000,
  })

  const productCount = productsPage != null ? String(productsPage.total) : null
  const userCount = usersData != null ? String(usersData.meta.total) : null
  const lowStockCount = lowStockData != null ? String(lowStockData.total) : null
  const orderCount = ordersData != null ? String(ordersData.total) : null

  if (!isAdmin) {
    return <BuyerOrdersDashboard />
  }

  return (
    <div>
      {/* Admin stat cards */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-xl-3">
          <StatCard
            label="Total Products"
            value={productCount}
            note="in product catalogue"
            accentColor="#7c3aed"
            accentBg="rgba(124, 58, 237, 0.14)"
            icon={<BoxIcon />}
            loading={productsLoading}
            href="/products"
          />
        </div>
        <div className="col-6 col-xl-3">
          <StatCard
            label="Total Orders"
            value={orderCount}
            note="active orders"
            accentColor="#3b82f6"
            accentBg="rgba(59, 130, 246, 0.14)"
            icon={<ClipboardIcon />}
            loading={ordersLoading}
            href="/orders"
          />
        </div>
        <div className="col-6 col-xl-3">
          <StatCard
            label="Registered Users"
            value={userCount}
            note="total accounts"
            accentColor="#10b981"
            accentBg="rgba(16, 185, 129, 0.14)"
            icon={<UsersIcon />}
            loading={usersLoading}
            href="/users"
          />
        </div>
        <div className="col-6 col-xl-3">
          <StatCard
            label="Low Stock Items"
            value={lowStockCount}
            note="below threshold"
            accentColor="#f59e0b"
            accentBg="rgba(245, 158, 11, 0.14)"
            icon={<AlertIcon />}
            loading={lowStockLoading}
            href="/products"
            search={{ page: 1, limit: 20, inStock: 'low_stock' }}
          />
        </div>
      </div>

      {/* Admin content row */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-xl-8">
          <div className="dash-card">
            <div className="dash-card-header">
              <div>
                <div className="dash-card-title">Revenue Overview</div>
                <div className="dash-card-sub">
                  Completed orders · last 12 months
                </div>
              </div>
              <div style={{ fontWeight: 700, fontSize: '1.15rem', color: '#e0e2f0' }}>
                {revenueLoading ? (
                  <span className="spinner-border spinner-border-sm" style={{ color: '#7c3aed' }} />
                ) : (
                  `€${(revenueData?.totalRevenue ?? 0).toFixed(2)}`
                )}
              </div>
            </div>

            {revenueLoading && !revenueData && (
              <div className="profile-loading">
                <div className="spinner-border" style={{ color: '#7c3aed' }} role="status" />
              </div>
            )}

            {!revenueLoading && (!revenueData || revenueData.monthlyRevenue.length === 0) && (
              <NoData message="No completed orders yet" />
            )}

            {revenueData && revenueData.monthlyRevenue.length > 0 && (() => {
              const max = Math.max(...revenueData.monthlyRevenue.map((m) => m.revenue), 1)
              return (
                <div style={{ padding: '0.5rem 1rem 1rem' }}>
                  {revenueData.monthlyRevenue.map((m) => {
                    const pct = (m.revenue / max) * 100
                    const [year, month] = m.month.split('-')
                    const label = new Date(Number(year), Number(month) - 1).toLocaleString('default', { month: 'short', year: '2-digit' })
                    return (
                      <div key={m.month} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                        <span style={{ width: '3.5rem', fontSize: '0.75rem', color: '#9396a5', flexShrink: 0 }}>{label}</span>
                        <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: '3px', height: '10px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: '#7c3aed', borderRadius: '3px', transition: 'width 0.3s' }} />
                        </div>
                        <span style={{ width: '5rem', fontSize: '0.75rem', color: '#e0e2f0', textAlign: 'right', flexShrink: 0 }}>
                          €{m.revenue.toFixed(2)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        </div>

        <div className="col-12 col-xl-4">
          <div className="dash-card h-100">
            <div className="dash-card-header">
              <div>
                <div className="dash-card-title">Recent Orders</div>
                <div className="dash-card-sub">Latest activity</div>
              </div>
            </div>
            {recentOrdersLoading && !recentOrders && (
              <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                <div className="spinner-border spinner-border-sm" style={{ color: '#7c3aed' }} role="status" />
              </div>
            )}
            {!recentOrdersLoading && (!recentOrders || recentOrders.data.length === 0) && (
              <NoData message="No orders yet" />
            )}
            {recentOrders && recentOrders.data.length > 0 && (
              <div className="dash-recent-orders">
                {recentOrders.data.map((o) => (
                  <div key={o.id} className="dash-recent-order-row" style={{ cursor: 'pointer' }} onClick={() => navigate({ to: '/orders/$id', params: { id: String(o.id) } })}>
                    <div className="dash-recent-order-left">
                      <span className="dash-recent-order-num">{o.orderNumber}</span>
                      <span className="dash-recent-order-cust">{o.createdByName ?? o.createdBy ?? '—'}</span>
                    </div>
                    <div className="dash-recent-order-right">
                      <span className={`order-status-badge order-status-${o.status}`}>
                        {o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                      </span>
                      <span className="dash-recent-order-total">
                        {o.totalInclVat != null ? '€' + o.totalInclVat.toFixed(2) : '—'}
                      </span>
                    </div>
                  </div>
                ))}
                <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <Link to="/orders" style={{ fontSize: '0.78rem', color: '#7c3aed', textDecoration: 'none' }}>
                    View all orders →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Exact Online */}
      <ExactOnlineSection />
    </div>
  )
}
