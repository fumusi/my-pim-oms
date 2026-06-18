import { useEffect, useRef } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useDispatch } from 'react-redux'
import { toast } from 'sonner'
import { exchangeOAuthCode } from '../api/auth'
import { setAccessToken } from '../store/authSlice'
import type { AppDispatch } from '../store'

export function OAuthCallbackPage() {
  const { code } = useSearch({ strict: false }) as { code?: string }
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  const called = useRef(false)

  useEffect(() => {
    if (called.current) return
    called.current = true

    if (!code) {
      toast.error('OAuth login failed — missing code')
      navigate({ to: '/login', replace: true })
      return
    }

    exchangeOAuthCode(code)
      .then((res) => {
        dispatch(setAccessToken(res.data.accessToken))
        navigate({ to: '/dashboard', replace: true })
      })
      .catch(() => {
        toast.error('OAuth login failed — please try again')
        navigate({ to: '/login', replace: true })
      })
  }, [])

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="spinner-border" style={{ color: '#7c3aed' }} role="status" />
        <p className="dashboard-sub" style={{ marginTop: '1rem' }}>Completing sign in…</p>
      </div>
      <div className="auth-arch" aria-hidden="true" />
    </div>
  )
}
