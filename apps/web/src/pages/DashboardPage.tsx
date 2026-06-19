import { useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useSelector } from 'react-redux'
import { Link } from '@tanstack/react-router'
import type { RootState } from '../store'
import { getExactStatus, getExactAuthorizeUrl, startExactSync, getExactSyncStatus } from '../api/exact'
import { getProducts } from '../api/products'
import { getUsers } from '../api/admin'

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
}

function StatCard({ label, value, note, accentColor, accentBg, icon, loading, href }: StatCardProps) {
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
      <Link to={href} style={{ textDecoration: 'none' }}>
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

// ── Page ──────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const user = useSelector((s: RootState) => s.auth.user)
  const isAdmin = user?.role === 'admin'

  const { data: productsPage, isLoading: productsLoading } = useQuery({
    queryKey: ['product-count'],
    queryFn: () => getProducts(1, 1).then((r) => r.data),
  })

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users-count'],
    queryFn: () => getUsers(1, 1).then((r) => r.data),
    enabled: isAdmin,
  })

  const productCount = productsPage != null ? String(productsPage.meta.total) : null
  const userCount = usersData != null ? String(usersData.meta.total) : null

  return (
    <div>
      {/* Stat cards */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-xl-3">
          <StatCard
            label="Total Products"
            value={productCount}
            note="synced from Exact Online"
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
            value={null}
            note="coming soon"
            accentColor="#3b82f6"
            accentBg="rgba(59, 130, 246, 0.14)"
            icon={<ClipboardIcon />}
          />
        </div>
        {isAdmin && (
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
        )}
        <div className="col-6 col-xl-3">
          <StatCard
            label="Low Stock Items"
            value={null}
            note="coming soon"
            accentColor="#f59e0b"
            accentBg="rgba(245, 158, 11, 0.14)"
            icon={<AlertIcon />}
          />
        </div>
      </div>

      {/* Content row */}
      <div className="row g-3 mb-4">
        {/* Revenue chart */}
        <div className="col-12 col-xl-8">
          <div className="dash-card">
            <div className="dash-card-header">
              <div>
                <div className="dash-card-title">Revenue Overview</div>
                <div className="dash-card-sub">Monthly revenue — last 12 months</div>
              </div>
            </div>
            <NoData message="Revenue data not available yet" />
          </div>
        </div>

        {/* Recent orders */}
        <div className="col-12 col-xl-4">
          <div className="dash-card h-100">
            <div className="dash-card-header">
              <div>
                <div className="dash-card-title">Recent Orders</div>
                <div className="dash-card-sub">Latest activity</div>
              </div>
            </div>
            <NoData message="No orders yet" />
          </div>
        </div>
      </div>

      {/* Exact Online */}
      <ExactOnlineSection />
    </div>
  )
}
