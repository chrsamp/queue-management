const oidcCookieName = 'oidc-jwt'

function secureCookieAttribute() {
  return window.location.protocol === 'https:' ? '; Secure' : ''
}

export function setOidcJwtCookie(token: string) {
  document.cookie = `${oidcCookieName}=${encodeURIComponent(
    token,
  )}; Path=/; SameSite=Lax${secureCookieAttribute()}`
}

export function clearOidcJwtCookie() {
  document.cookie = `${oidcCookieName}=; Max-Age=0; Path=/; SameSite=Lax${secureCookieAttribute()}`
}
