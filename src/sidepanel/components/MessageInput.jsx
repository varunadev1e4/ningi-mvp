import React, { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'

/**
 * MessageInput
 * @param {function}  onSend
 * @param {boolean}   disabled
 * @param {string}    placeholder
 * @param {function}  onTyping          — called on every keystroke (for typing indicator)
 * @param {string[]}  mentionUsernames  — list of usernames to suggest on @
 */
export default function MessageInput({
  onSend,
  disabled,
  placeholder = 'Message this room…',
  onTyping,
  mentionUsernames = [],
}) {
  const [text, setText]                   = useState('')
  const [suggestions, setSuggestions]     = useState([])
  const [suggestionIdx, setSuggestionIdx] = useState(0)
  const textareaRef = useRef(null)

  // ── @mention detection ───────────────────────────────────
  useEffect(() => {
    const lastWord = text.split(/\s/).pop() || ''
    if (lastWord.startsWith('@') && lastWord.length > 1) {
      const query = lastWord.slice(1).toLowerCase()
      const matches = mentionUsernames
        .filter(u => u.toLowerCase().startsWith(query))
        .slice(0, 5)
      setSuggestions(matches)
      setSuggestionIdx(0)
    } else {
      setSuggestions([])
    }
  }, [text, mentionUsernames.join(',')])

  const insertMention = (username) => {
    const words = text.split(/(\s)/)
    words[words.length - 1] = `@${username} `
    setText(words.join(''))
    setSuggestions([])
    textareaRef.current?.focus()
  }

  // ── Send ─────────────────────────────────────────────────
  const send = () => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText('')
    setSuggestions([])
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKeyDown = (e) => {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSuggestionIdx(i => Math.min(i + 1, suggestions.length - 1)); return }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSuggestionIdx(i => Math.max(i - 1, 0)); return }
      if (e.key === 'Tab' || e.key === 'Enter') {
        if (e.key === 'Enter') e.preventDefault()
        insertMention(suggestions[suggestionIdx])
        return
      }
      if (e.key === 'Escape') { setSuggestions([]); return }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const handleChange = (e) => {
    setText(e.target.value)
    onTyping?.()
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 100) + 'px'
  }

  if (disabled) {
    return (
      <div className="input-area">
        <div className="input-disabled-msg">Select a tab above to start chatting</div>
      </div>
    )
  }

  return (
    <div className="input-area" style={{ position: 'relative' }}>
      {/* @mention autocomplete dropdown */}
      {suggestions.length > 0 && (
        <div className="mention-dropdown">
          {suggestions.map((u, i) => (
            <button
              key={u}
              className={`mention-item${i === suggestionIdx ? ' active' : ''}`}
              onMouseDown={e => { e.preventDefault(); insertMention(u) }}
            >
              <span className="mention-item-at">@</span>{u}
            </button>
          ))}
        </div>
      )}

      <div className="input-wrap">
        <textarea
          ref={textareaRef}
          className="msg-textarea"
          rows={1}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
        />
        <button
          className="send-btn"
          onClick={send}
          disabled={!text.trim()}
          title="Send (Enter)"
        >
          ➤
        </button>
      </div>
      <div className="input-hint">Enter to send · Shift+Enter for new line · @ to mention</div>
    </div>
  )
}
