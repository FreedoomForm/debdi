'use client'
import { useEffect, useState } from 'react'
import { Send } from 'lucide-react'
import { listConversations, fetchMessages, sendMessage, type ChatConversation, type ChatMessage } from './index'
import { formatDate } from '../_shared'

export function ChatWindow() {
  const [convs, setConvs] = useState<ChatConversation[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')

  useEffect(() => { listConversations().then((d) => setConvs(d.items || d || [])) }, [])
  useEffect(() => {
    if (!active) return
    fetchMessages(active).then((d) => setMessages(d.items || d || []))
  }, [active])

  const onSend = async () => {
    if (!active || !draft.trim()) return
    const r = await sendMessage(active, draft.trim())
    setMessages([...messages, r])
    setDraft('')
  }

  return (
    <div className="grid lg:grid-cols-[320px_1fr] h-[calc(100vh-128px)] border-t">
      <aside className="border-r bg-white overflow-y-auto">
        {convs.length === 0 && <div className="p-6 text-slate-400 text-sm">Нет диалогов</div>}
        {convs.map((c) => (
          <button
            key={c.id}
            onClick={() => setActive(c.id)}
            className={`w-full text-left px-4 py-3 border-b hover:bg-slate-50 ${active === c.id ? 'bg-blue-50' : ''}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">Диалог #{c.id.slice(0, 6)}</span>
              {c.unreadCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-600 text-white font-bold">{c.unreadCount}</span>
              )}
            </div>
            {c.lastMessage && (
              <p className="text-xs text-slate-500 truncate mt-0.5">{c.lastMessage.body}</p>
            )}
          </button>
        ))}
      </aside>
      <main className="flex flex-col bg-slate-50">
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {messages.length === 0 && <div className="text-center text-slate-400 text-sm py-12">Выберите диалог</div>}
          {messages.map((m) => (
            <div key={m.id} className="max-w-[60%] bg-white border rounded-2xl px-3 py-2 shadow-sm">
              <p className="text-sm">{m.body}</p>
              <p className="text-[10px] text-slate-400 mt-1">{formatDate(m.createdAt)}</p>
            </div>
          ))}
        </div>
        <div className="border-t bg-white p-3 flex items-center gap-2">
          <input
            value={draft} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSend()}
            placeholder="Сообщение…"
            className="flex-1 h-10 rounded-lg border border-slate-200 px-3 outline-none focus:border-blue-500"
            disabled={!active}
          />
          <button
            onClick={onSend} disabled={!active || !draft.trim()}
            className="h-10 px-4 rounded-lg bg-blue-600 text-white inline-flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50"
          ><Send className="h-4 w-4" /></button>
        </div>
      </main>
    </div>
  )
}
