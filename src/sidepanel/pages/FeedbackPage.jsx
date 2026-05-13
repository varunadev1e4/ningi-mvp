import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useAppStore } from '../stores/appStore'

const CATEGORIES = [
  { value: 'bug', label: '🐛 Bug Report' },
  { value: 'feature', label: '✨ Feature Request' },
  { value: 'ux', label: '🎨 Design / UX' },
  { value: 'general', label: '💬 General' },
]

const RATINGS = ['😞', '😕', '😐', '🙂', '😍']

export default function FeedbackPage() {
  const { user, profile } = useAuthStore()
  const { closeFeedback } = useAppStore()

  const [rating, setRating] = useState(null)
  const [category, setCategory] = useState('general')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (rating === null) { setError('Please pick a rating'); return }
    if (!message.trim()) { setError('Please write something — even one line helps!'); return }

    setError('')
    setLoading(true)

    const { error: dbErr } = await supabase.from('feedback').insert({
      user_id: user.id,
      username: profile.username,
      rating: rating + 1,          // store 1–5
      category,
      message: message.trim(),
    })

    setLoading(false)
    if (dbErr) { setError('Something went wrong. Try again?'); return }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <>
        <div className="dm-header">
          <button className="back-btn" onClick={closeFeedback}>←</button>
          <div className="dm-user-info">
            <div className="dm-user-name">Feedback</div>
            <div className="dm-user-label">Beta v1.0</div>
          </div>
        </div>

        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '32px 24px', gap: 12, textAlign: 'center'
        }}>
          <div style={{ fontSize: 48 }}>🙏</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
            Thank you, {profile?.username}!
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Your feedback helps shape Ningi.<br />
            We read every single one.
          </div>
          <button
            className="auth-btn"
            style={{ marginTop: 12, width: '100%' }}
            onClick={closeFeedback}
          >
            Back to Ningi
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="dm-header">
        <button className="back-btn" onClick={closeFeedback}>←</button>
        <div className="dm-user-info">
          <div className="dm-user-name">Share Feedback</div>
          <div className="dm-user-label">Beta v1.0 · every word counts</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Rating */}
        <div className="fb-section">
          <div className="fb-label">How's your experience so far?</div>
          <div className="fb-emoji-row">
            {RATINGS.map((emoji, i) => (
              <button
                key={i}
                className={`fb-emoji-btn${rating === i ? ' selected' : ''}`}
                onClick={() => setRating(i)}
                type="button"
                title={['Terrible', 'Poor', 'Okay', 'Good', 'Love it'][i]}
              >
                {emoji}
              </button>
            ))}
          </div>
          {rating !== null && (
            <div className="fb-rating-label">
              {['Terrible 😞', 'Could be better', 'It\'s okay', 'Pretty good!', 'Absolutely love it! 🎉'][rating]}
            </div>
          )}
        </div>

        {/* Category */}
        <div className="fb-section">
          <div className="fb-label">What's this about?</div>
          <div className="fb-category-grid">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                className={`fb-category-btn${category === c.value ? ' selected' : ''}`}
                onClick={() => setCategory(c.value)}
                type="button"
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message */}
        <div className="fb-section">
          <div className="fb-label">Tell us more</div>
          <textarea
            className="fb-textarea"
            placeholder="What's working well? What's broken? What's missing? Anything helps…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            maxLength={1000}
          />
          <div className="fb-char-count">{message.length} / 1000</div>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <button
          className="auth-btn"
          onClick={handleSubmit}
          disabled={loading}
          style={{ marginTop: 4 }}
        >
          {loading ? 'Sending…' : 'Send Feedback'}
        </button>

        <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', paddingBottom: 8 }}>
          Submitted as @{profile?.username} · only the Ningi team sees this
        </div>
      </div>
    </>
  )
}
