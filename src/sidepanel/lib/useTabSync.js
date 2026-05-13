import { useEffect } from 'react'
import { useAppStore } from '../stores/appStore'
import { normalizeUrl, isValidTabUrl, isIgnouUrl } from './urlUtils'

/**
 * Two responsibilities:
 * 1. Keep the IGNOU tab list fresh for the dropdown (on all tab events)
 * 2. Auto-switch the chat room when user switches TO an IGNOU tab (onActivated only)
 *
 * onUpdated fires constantly (favicon, title, XHR, etc.) — never change
 * currentUrl there. onActivated only fires on explicit tab switches.
 */
export function useTabSync() {
  const { setTabs, setCurrentUrl } = useAppStore()

  useEffect(() => {
    // ── Refresh tab list only (no currentUrl change) ──────────
    const refreshList = () => {
      chrome.tabs.query({ currentWindow: true }, (chromeTabs) => {
        const valid = chromeTabs.filter(
          (t) => isValidTabUrl(t.url) && isIgnouUrl(t.url)
        )
        setTabs(valid)
      })
    }

    // ── Tab switch: update room if new active tab is IGNOU ─────
    const onActivated = ({ tabId }) => {
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) return  // tab may have closed
        refreshList()
        if (tab.url && isValidTabUrl(tab.url) && isIgnouUrl(tab.url)) {
          setCurrentUrl(normalizeUrl(tab.url))
        }
      })
    }

    // ── Page finishes loading: refresh list + update if active ─
    const onUpdated = (tabId, info) => {
      if (info.status !== 'complete') return
      refreshList()
      // Also update currentUrl if this completed tab is the active IGNOU tab
      chrome.tabs.query({ active: true, currentWindow: true }, ([active]) => {
        if (active?.id === tabId && isValidTabUrl(active.url) && isIgnouUrl(active.url)) {
          setCurrentUrl(normalizeUrl(active.url))
        }
      })
    }

    const onRemoved = () => refreshList()

    // Initial load
    chrome.tabs.query({ active: true, currentWindow: true }, ([active]) => {
      refreshList()
      if (active && isValidTabUrl(active.url) && isIgnouUrl(active.url)) {
        setCurrentUrl(normalizeUrl(active.url))
      }
    })

    chrome.tabs.onActivated.addListener(onActivated)
    chrome.tabs.onUpdated.addListener(onUpdated)
    chrome.tabs.onRemoved.addListener(onRemoved)

    return () => {
      chrome.tabs.onActivated.removeListener(onActivated)
      chrome.tabs.onUpdated.removeListener(onUpdated)
      chrome.tabs.onRemoved.removeListener(onRemoved)
    }
  }, [])
}
