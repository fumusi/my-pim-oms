import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import { forgotPassword } from '../api/auth'

const schema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
})

type FormData = z.infer<typeof schema>

export function ForgotPasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    try {
      await forgotPassword(data.email)
    } catch {
      // silent — always show the same message to avoid email enumeration
    }
    toast.success("If that email exists, you'll receive a reset link")
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-heading">Forgot password</h1>
        <p className="auth-desc">Enter your email and we'll send you a reset link.</p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="mb-4">
            <label className="auth-label">Email address</label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon"><MailIcon /></span>
              <input
                type="email"
                className={`auth-input${errors.email ? ' is-invalid' : ''}`}
                placeholder="you@example.com"
                {...register('email')}
              />
            </div>
            {errors.email && <p className="auth-error">{errors.email.message}</p>}
          </div>

          <button type="submit" className="auth-btn" disabled={isSubmitting || isSubmitSuccessful}>
            {isSubmitting ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                Sending…
              </>
            ) : (
              'Send reset link'
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

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}
