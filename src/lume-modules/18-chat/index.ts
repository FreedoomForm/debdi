/** Module 18: Internal Chat */
export type ChatConversation = {
  id: string
  participantIds: string[]
  lastMessage?: ChatMessage
  unreadCount: number
  updatedAt: string
}

export type ChatMessage = {
  id: string
  conversationId: string
  senderId: string
  body: string
  attachments?: { url: string; name: string }[]
  readBy: string[]
  createdAt: string
}

export async function listConversations() {
  const r = await fetch('/api/chat/conversations')
  return r.json()
}

export async function fetchMessages(conversationId: string, before?: string) {
  const sp = new URLSearchParams({ conversationId })
  if (before) sp.set('before', before)
  const r = await fetch(`/api/chat/messages?${sp}`)
  return r.json()
}

export async function sendMessage(conversationId: string, body: string) {
  const r = await fetch('/api/chat/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ conversationId, body }),
  })
  return r.json()
}
