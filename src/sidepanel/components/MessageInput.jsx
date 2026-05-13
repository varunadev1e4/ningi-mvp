import React, { useState, useRef } from 'react'

export default function MessageInput({ onSend, disabled, placeholder = 'Message this room…' }) {
  const [text, setText] = useState('')
  const textareaRef = useRef(null)

  const send = () => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const handleChange = (e) => {
    setText(e.target.value)
    // Auto-grow textarea
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
    <div className="input-area">
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
      <div className="input-hint">Enter to send · Shift+Enter for new line</div>
    </div>
  )
}
