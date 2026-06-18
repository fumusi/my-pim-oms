import { useDispatch } from 'react-redux'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import type { AppDispatch } from '../store'
import { clearAccessToken } from '../store/authSlice'
import { logout } from '../api/auth'

export function DashboardPage() {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()

  async function handleLogout() {
    try {
      await logout()
    } catch {
      // best-effort — clear local session regardless
    }
    dispatch(clearAccessToken())
    toast.success('Signed out')
    navigate({ to: '/login' })
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-card">
        <div className="dashboard-icon" aria-hidden="true">✓</div>
        <h1 className="dashboard-heading">You're logged in</h1>
        <p className="dashboard-sub">Login flow is working correctly.</p>
        <button className="auth-btn" onClick={handleLogout}>
          Sign out
        </button>
      </div>

      <div className="auth-arch" aria-hidden="true" />
    </div>
  )
}
