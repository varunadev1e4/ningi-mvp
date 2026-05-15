import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useReportStore = create((set, get) => ({
  submitting: false,
  lastError: null,
  submitted: {},   // { 'type:targetId': true } — session-level dedup

  submitReport: async ({ type, targetId, reason, details = '', contextUrl = '' }) => {
    set({ submitting: true, lastError: null })
    try {
      // Get current user — reporter_id is required by RLS policy
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      const { error } = await supabase.from('reports').insert({
        reporter_id: user.id,
        type,
        target_id:   targetId,
        reason,
        details:     details.slice(0, 500),
        context_url: contextUrl.slice(0, 2048),
      })
      if (error) throw error

      const key = `${type}:${targetId}`
      set(s => ({
        submitting: false,
        submitted:  { ...s.submitted, [key]: true },
      }))
      return { success: true }
    } catch (err) {
      set({ submitting: false, lastError: err.message })
      return { success: false, error: err.message }
    }
  },

  hasReported: (type, targetId) => Boolean(get().submitted[`${type}:${targetId}`]),
  clearError: () => set({ lastError: null }),
}))

export const REPORT_REASONS = {
  user: [
    { value: 'spam',                  label: 'Spam or self-promotion' },
    { value: 'harassment',            label: 'Harassment or bullying' },
    { value: 'hate_speech',           label: 'Hate speech or discrimination' },
    { value: 'impersonation',         label: 'Impersonation' },
    { value: 'inappropriate_content', label: 'Inappropriate content' },
    { value: 'other',                 label: 'Other' },
  ],
  message: [
    { value: 'spam',                  label: 'Spam or self-promotion' },
    { value: 'harassment',            label: 'Harassment or threatening' },
    { value: 'hate_speech',           label: 'Hate speech' },
    { value: 'misinformation',        label: 'Misinformation' },
    { value: 'inappropriate_content', label: 'Inappropriate or offensive' },
    { value: 'other',                 label: 'Other' },
  ],
}
