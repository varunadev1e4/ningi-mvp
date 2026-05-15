import { create } from 'zustand'

export const useAppStore = create((set, get) => ({
  view: 'chat',   // 'chat'|'dm'|'inbox'|'feedback'|'profile'|'collections'|'groups'|'group-chat'
  dmUser: null,
  profileUser: null,
  currentGroup: null,
  currentUrl: '',
  tabs: [],
  unreadDMs: {},
  totalUnread: 0,
  pendingFriendRequests: 0,
  _currentUserId: null,

  setCurrentUserId: (id) => set({ _currentUserId: id }),
  setView: (view) => set({ view }),
  setCurrentUrl: (url) => set({ currentUrl: url }),
  setTabs: (tabs) => set({ tabs }),
  setPendingFriendRequests: (n) => set({ pendingFriendRequests: n }),

  openDM: (user) => {
    const myId = get()._currentUserId
    const convId = myId ? [user.id, myId].sort().join(':') : null
    const unreadDMs = { ...get().unreadDMs }
    if (convId) delete unreadDMs[convId]
    const totalUnread = Object.values(unreadDMs).reduce((s, v) => s + v.count, 0)
    set({ view: 'dm', dmUser: user, unreadDMs, totalUnread })
  },
  closeDM:       () => set({ view: 'chat', dmUser: null }),
  openInbox:     () => set({ view: 'inbox' }),
  closeInbox:    () => set({ view: 'chat' }),
  openFeedback:  () => set({ view: 'feedback' }),
  closeFeedback: () => set({ view: 'chat' }),
  openGroups:    () => set({ view: 'groups', currentGroup: null }),
  openGroup:     (group) => set({ view: 'group-chat', currentGroup: group }),
  closeGroup:    () => set({ view: 'groups', currentGroup: null }),

  openProfile: (user) => set({ view: 'profile', profileUser: user }),
  closeProfile: () => set({ view: 'chat', profileUser: null }),

  addUnreadDM: (convId, senderUsername, lastContent) => {
    const { view, dmUser, _currentUserId, unreadDMs } = get()
    const [a, b] = convId.split(':')
    const otherUserId = a === _currentUserId ? b : a
    if (view === 'dm' && dmUser?.id === otherUserId) return
    const current = unreadDMs[convId] || { count: 0, senderUsername, lastContent }
    const updated = { ...unreadDMs, [convId]: { count: current.count + 1, senderUsername, lastContent } }
    const totalUnread = Object.values(updated).reduce((s, v) => s + v.count, 0)
    set({ unreadDMs: updated, totalUnread })
  },

  clearUnread: (convId) => {
    const unreadDMs = { ...get().unreadDMs }
    delete unreadDMs[convId]
    const totalUnread = Object.values(unreadDMs).reduce((s, v) => s + v.count, 0)
    set({ unreadDMs, totalUnread })
  }
}))
