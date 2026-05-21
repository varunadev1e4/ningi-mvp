import { useEffect, useState, useRef, useCallback } from 'react'

const TYPING_TIMEOUT = 3000 // ms of silence before stopping

/**
 * useTyping
 * Sends typing broadcasts and listens for others typing.
 * Returns: { typingUsers: ['alice', 'bob'], onTyping }
 *
 * @param {object|null} channel — supabase channel ref
 * @param {string}      username — current user's username
 */
export function useTyping(channel, username) {
  const [typingUsers, setTypingUsers] = useState([]) // other users typing
  const stopTimerRef  = useRef(null)
  const isTypingRef   = useRef(false)

  // Listen for others typing
  useEffect(() => {
    if (!channel) return

    const handler = ({ payload }) => {
      const { username: who, typing } = payload
      if (who === username) return // ignore self
      setTypingUsers(prev => {
        if (typing) return prev.includes(who) ? prev : [...prev, who]
        return prev.filter(u => u !== who)
      })
      // Auto-clear after timeout in case stop broadcast is missed
      if (typing) {
        setTimeout(() => {
          setTypingUsers(prev => prev.filter(u => u !== who))
        }, TYPING_TIMEOUT + 500)
      }
    }

    channel.on('broadcast', { event: 'typing' }, handler)
    return () => setTypingUsers([])
  }, [channel?.topic, username])

  // Called by MessageInput on every keystroke
  const onTyping = useCallback(() => {
    if (!channel || !username) return

    if (!isTypingRef.current) {
      isTypingRef.current = true
      channel.send({ type: 'broadcast', event: 'typing', payload: { username, typing: true } })
    }

    // Reset stop timer
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current)
    stopTimerRef.current = setTimeout(() => {
      isTypingRef.current = false
      channel.send({ type: 'broadcast', event: 'typing', payload: { username, typing: false } })
    }, TYPING_TIMEOUT)
  }, [channel?.topic, username])

  // Stop typing on unmount / channel change
  useEffect(() => {
    return () => {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current)
      if (isTypingRef.current && channel) {
        channel.send({ type: 'broadcast', event: 'typing', payload: { username, typing: false } })
      }
    }
  }, [channel?.topic])

  const typingLabel = typingUsers.length === 0 ? null
    : typingUsers.length === 1 ? `${typingUsers[0]} is typing…`
    : typingUsers.length === 2 ? `${typingUsers[0]} and ${typingUsers[1]} are typing…`
    : 'Several people are typing…'

  return { typingUsers, typingLabel, onTyping }
}
