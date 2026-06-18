import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'
import { toast } from 'sonner'
import { getMe, deleteMe } from '../api/users'
import { clearAccessToken } from '../store/authSlice'
import { RoleBadge } from '../components/RoleBadge'
import { ConfirmModal } from '../components/ConfirmModal'
import type { AppDispatch } from '../store'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function AvatarInitial({ email }: { email: string }) {
  return (
    <div className="profile-avatar" aria-hidden="true">
      {email.charAt(0).toUpperCase()}
    </div>
  )
}

export function ProfilePage() {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['me'],
    queryFn: () => getMe().then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteMe,
    onSuccess: () => {
      dispatch(clearAccessToken())
      toast.success('Account deleted')
      navigate({ to: '/login' })
    },
    onError: () => toast.error('Failed to delete account. Please try again.'),
  })

  if (isLoading) {
    return (
      <div className="profile-loading">
        <div className="spinner-border" style={{ color: '#7c3aed' }} role="status" />
      </div>
    )
  }

  if (isError || !profile) {
    return (
      <div className="profile-loading">
        <p style={{ color: '#f87171' }}>Failed to load profile.</p>
      </div>
    )
  }

  const displayName =
    profile.firstName || profile.lastName
      ? [profile.firstName, profile.lastName].filter(Boolean).join(' ')
      : null

  return (
    <>
      <div className="profile-wrap">
        <div className="profile-card">
          <div className="profile-header">
            <AvatarInitial email={profile.email} />
            <div className="profile-header-info">
              {displayName && <div className="profile-display-name">{displayName}</div>}
              <div className="profile-email">{profile.email}</div>
              <RoleBadge role={profile.role} />
            </div>
          </div>

          <div className="profile-divider" />

          <dl className="profile-details">
            <div className="profile-row">
              <dt className="profile-dt">Email</dt>
              <dd className="profile-dd">{profile.email}</dd>
            </div>
            <div className="profile-row">
              <dt className="profile-dt">Role</dt>
              <dd className="profile-dd">
                <RoleBadge role={profile.role} />
              </dd>
            </div>
            <div className="profile-row">
              <dt className="profile-dt">First name</dt>
              <dd className="profile-dd">
                {profile.firstName ?? <span className="profile-empty">—</span>}
              </dd>
            </div>
            <div className="profile-row">
              <dt className="profile-dt">Last name</dt>
              <dd className="profile-dd">
                {profile.lastName ?? <span className="profile-empty">—</span>}
              </dd>
            </div>
            <div className="profile-row">
              <dt className="profile-dt">Member since</dt>
              <dd className="profile-dd">{formatDate(profile.createdAt)}</dd>
            </div>
          </dl>

          <div className="profile-divider" />

          <div className="profile-actions">
            <Link to="/forgot-password" className="profile-action-link">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Change password
            </Link>

            <button
              className="profile-action-link profile-action-danger"
              onClick={() => setShowDeleteModal(true)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
              Delete my account
            </button>
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <ConfirmModal
          title="Delete account"
          message="This will permanently delete your account. This action cannot be undone."
          confirmLabel="Delete account"
          danger
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate()}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </>
  )
}
