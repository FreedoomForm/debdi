/** Module 17: Notifications */
export type LumeNotification = {
  id: string
  type: 'order' | 'system' | 'finance' | 'warehouse' | 'message'
  title: string
  body: string
  read: boolean
  href?: string
  createdAt: string
  severity?: 'info' | 'success' | 'warning' | 'error'
}

export async function listNotifications(unreadOnly = false) {
  const r = await fetch(`/api/admin/notifications${unreadOnly ? '?unread=1' : ''}`)
  return r.json()
}

export async function markNotificationRead(id: string) {
  return fetch(`/api/admin/notifications/${id}/read`, { method: 'POST' })
}

export async function markAllNotificationsRead() {
  return fetch('/api/admin/notifications/read-all', { method: 'POST' })
}
