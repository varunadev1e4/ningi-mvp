/**
 * Normalise a raw browser URL into a stable room key.
 * Strips query params, hash, and trailing slash.
 * e.g.  https://github.com/vercel/next.js?tab=readme#top
 *       → github.com/vercel/next.js
 */
export function normalizeUrl(rawUrl) {
  try {
    const url = new URL(rawUrl)
    let key = url.hostname + url.pathname
    key = key.replace(/\/+$/, '') // strip trailing slashes
    return key.toLowerCase()
  } catch {
    return rawUrl
  }
}

/** Only http/https URLs are valid room candidates */
export function isValidTabUrl(url) {
  if (!url) return false
  return url.startsWith('http://') || url.startsWith('https://')
}

/** Chat rooms are restricted to IGNOU URLs for the beta */
export function isIgnouUrl(url) {
  if (!url) return false
  return url.toLowerCase().includes('ignou')
}

/** Short human-readable label for a URL */
export function shortUrl(rawUrl) {
  try {
    const url = new URL(rawUrl)
    let label = url.hostname + url.pathname
    label = label.replace(/\/+$/, '')
    if (label.length > 45) label = label.slice(0, 42) + '…'
    return label
  } catch {
    return rawUrl
  }
}
