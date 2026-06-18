import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { getMe, type UserProfile } from '../api/auth'
import { RoleBadge } from '../components/RoleBadge'

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
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getMe()
      .then((res) => setProfile(res.data))
      .catch(() => setError('Failed to load profile.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="spinner-border" style={{ color: '#7c3aed' }} role="status" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="profile-loading">
        <p style={{ color: '#f87171' }}>{error ?? 'Something went wrong.'}</p>
      </div>
    )
  }

  const displayName =
    profile.firstName || profile.lastName
      ? [profile.firstName, profile.lastName].filter(Boolean).join(' ')
      : null

  return (
    <div className="profile-wrap">
      <div className="profile-card">
        {/* Header */}
        <div className="profile-header">
          <AvatarInitial email={profile.email} />
          <div className="profile-header-info">
            {displayName && <div className="profile-display-name">{displayName}</div>}
            <div className="profile-email">{profile.email}</div>
            <RoleBadge role={profile.role} />
          </div>
        </div>

        <div className="profile-divider" />

        {/* Details */}
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
            <dd className="profile-dd">{profile.firstName ?? <span className="profile-empty">—</span>}</dd>
          </div>
          <div className="profile-row">
            <dt className="profile-dt">Last name</dt>
            <dd className="profile-dd">{profile.lastName ?? <span className="profile-empty">—</span>}</dd>
          </div>
          <div className="profile-row">
            <dt className="profile-dt">Member since</dt>
            <dd className="profile-dd">{formatDate(profile.createdAt)}</dd>
          </div>
        </dl>

        <div className="profile-divider" />

        {/* Actions */}
        <div className="profile-actions">
          <Link to="/reset-password" className="profile-action-link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Change password
          </Link>
        </div>
      </div>
    </div>
  )
}
