import { useState, useCallback } from 'react'

const KEY      = 'ningi_room_history'
const MAX_ITEMS = 8

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}

function write(items) {
  try { localStorage.setItem(KEY, JSON.stringify(items)) } catch {}
}

export function useRoomHistory() {
  const [history, setHistory] = useState(read)

  const addRoom = useCallback((url, title = '') => {
    const prev = read()
    const filtered = prev.filter(r => r.url !== url)
    const updated  = [{ url, title: title || url, visitedAt: Date.now() }, ...filtered].slice(0, MAX_ITEMS)
    write(updated)
    setHistory(updated)
  }, [])

  const clearHistory = useCallback(() => {
    write([])
    setHistory([])
  }, [])

  return { history, addRoom, clearHistory }
}
