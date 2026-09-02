import 'server-only'

export function isPublicKioskEnabled() {
  return process.env.PRESENCE_PUBLIC_KIOSK_ENABLED === 'true'
}
