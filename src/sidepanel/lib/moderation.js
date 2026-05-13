/**
 * Client-side content moderation.
 * Pattern-based filter covering profanity, slurs, hate speech, and threats.
 * No API key needed — works offline, zero latency.
 *
 * Returns null  → message is clean, allow it
 * Returns string → blocked, show this message to the user
 */

// ── Blocked patterns ───────────────────────────────────────────
// Each entry: { pattern: RegExp, reason: string }
// Using word-boundary aware regex so "bass" doesn't match "ass" etc.
const RULES = [
  // Hard profanity
  {
    pattern: /\b(f+u+c+k+|f[*@!]+ck|fuk|fck|fuq)\b/i,
    reason: 'profanity'
  },
  {
    pattern: /\b(s+h+i+t+|sh[*@!]+t|$hit)\b/i,
    reason: 'profanity'
  },
  {
    pattern: /\b(b+i+t+c+h+|b[*@!]+tch)\b/i,
    reason: 'profanity'
  },
  {
    pattern: /\b(a+s+s+h+o+l+e+|a[*@!]+hole)\b/i,
    reason: 'profanity'
  },
  {
    pattern: /\b(bastard|b@stard)\b/i,
    reason: 'profanity'
  },
  // Sexual content
  {
    pattern: /\b(porn|p0rn|xxx|nude|nudes|naked|onlyfans)\b/i,
    reason: 'explicit content'
  },
  // Slurs (common ones, kept minimal to avoid false positives)
  {
    pattern: /\bn[*i]+gg[aer]\b/i,
    reason: 'hate speech'
  },
  {
    pattern: /\b(ch[i1]nk|sp[i1]c|k[iy]+ke|w[e3]tb[a@]ck)\b/i,
    reason: 'hate speech'
  },
  // Threats
  {
    pattern: /\b(i(ll|'ll|will)\s+(kill|murder|hurt|beat|rape|destroy)\s+(you|u|him|her|them))\b/i,
    reason: 'threatening language'
  },
  {
    pattern: /\b(kill\s+(your|ur|yourself|urself))\b/i,
    reason: 'threatening language'
  },
  // Spam / scam patterns
  {
    pattern: /\b(click\s*here|buy\s*now|free\s*money|earn\s*\d+|whatsapp\s*me|telegram\s*me)\b/i,
    reason: 'spam'
  },
]

// ── Normaliser: catch l33t speak and character substitutions ───
function normalise(text) {
  return text
    .replace(/[4@]/g, 'a')
    .replace(/[3€]/g, 'e')
    .replace(/[1!|]/g, 'i')
    .replace(/[0]/g, 'o')
    .replace(/[$5]/g, 's')
    .replace(/[7]/g, 't')
    .replace(/[+]/g, 't')
    .toLowerCase()
}

const FRIENDLY = {
  profanity: 'Please keep the language clean — students of all ages are here.',
  'explicit content': 'Explicit content is not allowed in this community.',
  'hate speech': 'Hate speech and slurs are not allowed. Please be respectful.',
  'threatening language': 'Threatening messages are not allowed.',
  spam: 'Promotional or spam messages are not allowed.',
}

/**
 * Returns null if the message is clean.
 * Returns a user-friendly string if it should be blocked.
 */
export function moderate(text) {
  if (!text || !text.trim()) return null

  const normalised = normalise(text)

  for (const { pattern, reason } of RULES) {
    if (pattern.test(normalised) || pattern.test(text)) {
      return FRIENDLY[reason] || 'Your message was flagged. Please rephrase.'
    }
  }

  return null
}
