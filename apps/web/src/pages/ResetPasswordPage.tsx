import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { toast } from 'sonner'
import { resetPassword } from '../api/auth'

const schema = z
  .object({
    newPassword: z
      .string()
      .min(8, { message: 'Password must be at least 8 characters' })
      .refine((v) => /[A-Z]/.test(v), { message: 'Password must contain at least one uppercase letter' })
      .refine((v) => /[0-9]/.test(v), { message: 'Password must contain at least one number' }),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type FormData = z.infer<typeof schema>

type ApiError = {
  response?: { data?: { message?: string } }
}

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const { token } = useSearch({ strict: false }) as { token?: string }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div
            className="dashboard-icon"
            style={{ margin: '0 auto 1.25rem', background: 'rgba(248,113,113,0.1)', borderColor: 'rgba(248,113,113,0.3)', color: '#f87171' }}
          >
            ✕
          </div>
          <h1 className="auth-heading">Invalid link</h1>
          <p className="dashboard-sub">This reset link is missing a token.</p>
          <Link
            to="/forgot-password"
            className="auth-btn"
            style={{ marginTop: '0.5rem', textDecoration: 'none' }}
          >
            Request a new link
          </Link>
        </div>
        <div className="auth-arch" aria-hidden="true" />
      </div>
    )
  }

  async function onSubmit(data: FormData) {
    try {
      await resetPassword(token!, data.newPassword, data.confirmPassword)
      toast.success('Password reset successfully')
      navigate({ to: '/login' })
    } catch (err: unknown) {
      const msg = (err as ApiError)?.response?.data?.message ?? 'Reset failed'
      toast.error(msg)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-heading">Reset password</h1>
        <p className="auth-desc">Choose a new password for your account.</p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="mb-4">
            <label className="auth-label">New password</label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon"><LockIcon /></span>
              <input
                type="password"
                className={`auth-input${errors.newPassword ? ' is-invalid' : ''}`}
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                {...register('newPassword')}
              />
            </div>
            {errors.newPassword && <p className="auth-error">{errors.newPassword.message}</p>}
          </div>

          <div className="mb-4">
            <label className="auth-label">Confirm new password</label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon"><LockIcon /></span>
              <input
                type="password"
                className={`auth-input${errors.confirmPassword ? ' is-invalid' : ''}`}
                placeholder="Repeat your new password"
                {...register('confirmPassword')}
              />
            </div>
            {errors.confirmPassword && <p className="auth-error">{errors.confirmPassword.message}</p>}
          </div>

          <button type="submit" className="auth-btn" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                Resetting…
              </>
            ) : (
              'Reset password'
            )}
          </button>
        </form>

        <p className="auth-footer">
          <Link to="/login" className="auth-link">← Back to sign in</Link>
        </p>
      </div>

      <div className="auth-arch" aria-hidden="true" />
    </div>
  )
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}
