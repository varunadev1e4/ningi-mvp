import React, { useState } from 'react'
import { useAuthStore } from '../stores/authStore'

// ── Validation helpers ─────────────────────────────────────────
function validateUsername(v) {
  if (!v.trim())                       return 'Username is required'
  if (v.trim().length < 3)             return 'At least 3 characters'
  if (v.trim().length > 24)            return 'Max 24 characters'
  if (!/^[a-zA-Z0-9_]+$/.test(v))     return 'Only letters, numbers and _ allowed'
  if (/^[_]/.test(v))                  return 'Cannot start with an underscore'
  return null
}

function validatePassword(v) {
  if (!v)                              return 'Password is required'
  if (v.length < 8)                    return 'At least 8 characters'
  if (!/[A-Z]/.test(v))               return 'Include at least one uppercase letter'
  if (!/[0-9]/.test(v))               return 'Include at least one number'
  return null
}

function validateEmail(v) {
  if (!v.trim())                       return 'Email is required'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address'
  return null
}

// Small inline error hint under each field
function FieldError({ msg }) {
  if (!msg) return null
  return <div className="field-error">{msg}</div>
}

// Password strength bar
function StrengthBar({ password }) {
  if (!password) return null
  let score = 0
  if (password.length >= 8)           score++
  if (/[A-Z]/.test(password))         score++
  if (/[0-9]/.test(password))         score++
  if (/[^a-zA-Z0-9]/.test(password))  score++

  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong']
  const colors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e']

  return (
    <div className="strength-wrap">
      <div className="strength-bars">
        {[1,2,3,4].map(i => (
          <div
            key={i}
            className="strength-bar"
            style={{ background: i <= score ? colors[score] : 'var(--surface3)' }}
          />
        ))}
      </div>
      {score > 0 && (
        <span className="strength-label" style={{ color: colors[score] }}>
          {labels[score]}
        </span>
      )}
    </div>
  )
}

export default function AuthPage() {
  const [mode, setMode]         = useState('signin')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [touched, setTouched]   = useState({})   // which fields have been interacted with
  const [submitError, setSubmitError] = useState('')
  const [loading, setLoading]   = useState(false)

  const { signIn, signUp } = useAuthStore()

  const switchMode = (m) => {
    setMode(m)
    setSubmitError('')
    setTouched({})
  }

  const touch = (field) => setTouched((t) => ({ ...t, [field]: true }))

  // Live errors (only shown after field is touched)
  const usernameErr = mode === 'signup' ? validateUsername(username) : null
  const passwordErr = validatePassword(password)
  const emailErr    = validateEmail(email)

  const canSubmit = mode === 'signin'
    ? !emailErr && !passwordErr
    : !usernameErr && !emailErr && !passwordErr

  const handleSubmit = async (e) => {
    e.preventDefault()
    // Touch all fields to show any remaining errors
    setTouched({ username: true, email: true, password: true })
    if (!canSubmit) return

    setSubmitError('')
    setLoading(true)
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password)
      } else {
        await signUp(email.trim(), password, username.trim())
      }
    } catch (err) {
      let msg = err.message
      if (msg.includes('Invalid login credentials'))    msg = 'Incorrect email or password.'
      if (msg.includes('already registered'))           msg = 'This email is already registered. Try signing in.'
      if (msg.includes('duplicate') && msg.includes('username')) msg = 'That username is already taken.'
      setSubmitError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-logo">
        <div className="auth-logo-mark">N</div>
        <span className="auth-logo-text">ningi</span>
      </div>
      <p className="auth-tagline">real-time chat on every URL</p>

      <div className="auth-tabs">
        <button type="button" className={`auth-tab${mode === 'signin' ? ' active' : ''}`} onClick={() => switchMode('signin')}>Sign In</button>
        <button type="button" className={`auth-tab${mode === 'signup' ? ' active' : ''}`} onClick={() => switchMode('signup')}>Sign Up</button>
      </div>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>

        {mode === 'signup' && (
          <div className="field-wrap">
            <input
              className={`auth-input${touched.username && usernameErr ? ' input-error' : ''}`}
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onBlur={() => touch('username')}
              autoComplete="off"
              maxLength={24}
            />
            {touched.username && <FieldError msg={usernameErr} />}
            {!usernameErr && username && (
              <div className="field-ok">✓ @{username.trim()} looks good</div>
            )}
          </div>
        )}

        <div className="field-wrap">
          <input
            className={`auth-input${touched.email && emailErr ? ' input-error' : ''}`}
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => touch('email')}
            autoComplete="email"
          />
          {touched.email && <FieldError msg={emailErr} />}
        </div>

        <div className="field-wrap">
          <input
            className={`auth-input${touched.password && passwordErr ? ' input-error' : ''}`}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => touch('password')}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          />
          {touched.password && <FieldError msg={passwordErr} />}
          {mode === 'signup' && <StrengthBar password={password} />}
        </div>

        {mode === 'signup' && (
          <div className="auth-rules">
            <span className={password.length >= 8  ? 'rule ok' : 'rule'}>✓ 8+ characters</span>
            <span className={/[A-Z]/.test(password) ? 'rule ok' : 'rule'}>✓ uppercase letter</span>
            <span className={/[0-9]/.test(password) ? 'rule ok' : 'rule'}>✓ one number</span>
          </div>
        )}

        {submitError && <div className="auth-error">{submitError}</div>}

        <button className="auth-btn" type="submit" disabled={loading}>
          {loading ? '…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
        </button>
      </form>
    </div>
  )
}
