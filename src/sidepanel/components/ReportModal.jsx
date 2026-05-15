import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useReportStore, REPORT_REASONS } from '../stores/reportStore'

/**
 * ReportModal — bottom sheet for reporting a user or message
 *
 * Props:
 *   open           {boolean}
 *   onClose        {function}
 *   type           {'user'|'message'}
 *   targetId       {string}  userId or messageId
 *   targetName     {string}  display name
 *   contextUrl     {string}  current page URL (attached for context)
 *   messageSnippet {string}  short preview of reported message
 */
export default function ReportModal({
  open, onClose,
  type = 'user', targetId, targetName = '',
  contextUrl = '', messageSnippet = '',
}) {
  const { submitReport, submitting, hasReported } = useReportStore()
  const [reason, setReason]   = useState('')
  const [details, setDetails] = useState('')
  const [step, setStep]       = useState('form') // 'form' | 'success'

  const reasons = REPORT_REASONS[type] ?? REPORT_REASONS.user
  const alreadyReported = hasReported(type, targetId)

  useEffect(() => {
    if (open) {
      setReason('')
      setDetails('')
      setStep(alreadyReported ? 'success' : 'form')
    }
  }, [open, alreadyReported])

  const handleSubmit = async () => {
    if (!reason) return
    const result = await submitReport({ type, targetId, reason, details, contextUrl })
    if (result.success) setStep('success')
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="report-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="report-modal"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {/* Header */}
            <div className="report-modal__header">
              <div className="report-modal__title-row">
                <span className="report-modal__icon">⚑</span>
                <h3 className="report-modal__title">
                  {type === 'message' ? 'Report message' : `Report ${targetName || 'user'}`}
                </h3>
              </div>
              <button className="report-modal__close" onClick={onClose} aria-label="Close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <AnimatePresence mode="wait">
              {step === 'form' ? (
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="report-modal__body">
                  {type === 'message' && messageSnippet && (
                    <div className="report-modal__snippet">
                      <span className="report-modal__snippet-label">Reported message</span>
                      <p className="report-modal__snippet-text">"{messageSnippet}"</p>
                    </div>
                  )}
                  <p className="report-modal__subtitle">
                    Why are you reporting {type === 'message' ? 'this message' : 'this user'}?
                  </p>
                  <div className="report-modal__reasons">
                    {reasons.map(r => (
                      <button
                        key={r.value}
                        className={`report-reason-btn${reason === r.value ? ' report-reason-btn--selected' : ''}`}
                        onClick={() => setReason(r.value)}
                      >
                        <span className="report-reason-btn__check">{reason === r.value ? '●' : '○'}</span>
                        {r.label}
                      </button>
                    ))}
                  </div>
                  {reason && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="report-modal__details-wrap">
                      <textarea
                        className="report-modal__details"
                        placeholder="Add more details (optional)"
                        value={details}
                        onChange={e => setDetails(e.target.value)}
                        rows={3}
                        maxLength={500}
                      />
                      <span className="report-modal__char-count">{details.length}/500</span>
                    </motion.div>
                  )}
                  <p className="report-modal__disclaimer">
                    Reports are reviewed by the Ningi team. False reports may result in account action.
                  </p>
                  <div className="report-modal__actions">
                    <button className="report-modal__cancel" onClick={onClose}>Cancel</button>
                    <button className="report-modal__submit" onClick={handleSubmit} disabled={!reason || submitting}>
                      {submitting ? 'Sending…' : 'Submit report'}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="report-modal__success">
                  <div className="report-modal__success-icon">✓</div>
                  <h4 className="report-modal__success-title">Report submitted</h4>
                  <p className="report-modal__success-text">
                    Thank you. The Ningi team will review this report.
                  </p>
                  <button className="report-modal__submit" onClick={onClose}>Done</button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
