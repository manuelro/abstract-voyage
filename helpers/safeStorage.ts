// Minimal, SSR-safe storage with cookie fallback (Safari private mode safe) — hvle
export type SafeStorage = {
  available(): boolean
  get(key: string): string | null
  set(key: string, value: string): void
  remove(key: string): void
}

const escapeRe = (s: string) => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')

export const safeStorage: SafeStorage = {
  available() {
    try {
      if (typeof window === 'undefined') return false
      const k = '__probe__'
      window.localStorage.setItem(k, '1')
      window.localStorage.removeItem(k)
      return true
    } catch {
      return false
    }
  },

  get(key) {
    // 1) Try localStorage
    try {
      if (typeof window !== 'undefined') {
        const v = window.localStorage.getItem(key)
        if (v != null) return v
      }
    } catch {}
    // 2) Cookie fallback
    try {
      if (typeof document !== 'undefined') {
        const m = document.cookie.match(
          new RegExp('(?:^|;\\s*)' + escapeRe(key) + '=([^;]*)')
        )
        return m ? decodeURIComponent(m[1]) : null
      }
    } catch {}
    return null
  },

  set(key, value) {
    // best-effort localStorage
    try {
      if (typeof window !== 'undefined') window.localStorage.setItem(key, value)
    } catch {}
    // cookie fallback (1 year)
    try {
      if (typeof document !== 'undefined') {
        const maxAge = 60 * 60 * 24 * 365
        const secure =
          typeof window !== 'undefined' && window.isSecureContext ? '; Secure' : ''
        document.cookie = `${key}=${encodeURIComponent(
          value
        )}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`
      }
    } catch {}
  },

  remove(key) {
    try {
      if (typeof window !== 'undefined') window.localStorage.removeItem(key)
    } catch {}
    try {
      if (typeof document !== 'undefined') {
        const secure =
          typeof window !== 'undefined' && window.isSecureContext ? '; Secure' : ''
        document.cookie = `${key}=; Path=/; Max-Age=0; SameSite=Lax${secure}`
      }
    } catch {}
  },
}
