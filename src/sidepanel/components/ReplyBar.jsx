import React from 'react'

export default function ReplyBar({ replyingTo, onCancel }) {
  if (!replyingTo) return null

  return (
    <div className="reply-bar">
      <div className="reply-bar-inner">
        <div className="reply-bar-line" />
        <div className="reply-bar-content">
          <span className="reply-bar-name">↩ {replyingTo.username}</span>
          <span className="reply-bar-text">
            {replyingTo.content.length > 70
              ? replyingTo.content.slice(0, 70) + '…'
              : replyingTo.content}
          </span>
        </div>
      </div>
      <button className="reply-bar-cancel" onClick={onCancel} title="Cancel reply">✕</button>
    </div>
  )
}
