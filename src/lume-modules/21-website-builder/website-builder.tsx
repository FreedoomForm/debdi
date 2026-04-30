'use client'
import { useEffect, useState } from 'react'
import { Sparkles, Save, Eye } from 'lucide-react'
import { fetchWebsite, saveWebsite, aiEditWebsite, type WebsiteSettings } from './index'

export function WebsiteBuilder({ subdomain }: { subdomain: string }) {
  const [site, setSite] = useState<WebsiteSettings | null>(null)
  const [prompt, setPrompt] = useState('')
  const [loadingAi, setLoadingAi] = useState(false)
  useEffect(() => { fetchWebsite(subdomain).then(setSite).catch(() => {}) }, [subdomain])
  if (!site) return <div className="p-6 text-slate-400">Загрузка…</div>
  return (
    <div className="grid lg:grid-cols-[360px_1fr] gap-4 p-6">
      <aside className="space-y-3">
        <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-3">
          <h3 className="font-semibold">Сайт {subdomain}.lume.uz</h3>
          <label className="block">
            <span className="text-sm font-medium">Заголовок</span>
            <input
              value={site.title}
              onChange={(e) => setSite({ ...site, title: e.target.value })}
              className="mt-1 block w-full h-10 rounded-lg border border-slate-200 px-3"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Тема</span>
            <select
              value={site.theme}
              onChange={(e) => setSite({ ...site, theme: e.target.value as WebsiteSettings['theme'] })}
              className="mt-1 block w-full h-10 rounded-lg border border-slate-200 px-3"
            >
              <option value="minimal">Minimal</option>
              <option value="gourmet">Gourmet</option>
              <option value="vibrant">Vibrant</option>
              <option value="classic">Classic</option>
            </select>
          </label>
          <button
            onClick={() => saveWebsite(subdomain, site)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          ><Save className="h-4 w-4" /> Сохранить</button>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-600" /> AI редактирование
          </h3>
          <textarea
            value={prompt} onChange={(e) => setPrompt(e.target.value)}
            placeholder="Например: «Сделай Hero секцию более тёплой, добавь акцент на детский рацион»"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm h-24"
          />
          <button
            onClick={async () => {
              setLoadingAi(true)
              const r = await aiEditWebsite(subdomain, prompt)
              if (r?.site) setSite(r.site)
              setLoadingAi(false)
            }}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
            disabled={loadingAi || !prompt}
          ><Sparkles className="h-4 w-4" /> {loadingAi ? 'Думаю…' : 'Применить AI'}</button>
        </div>
      </aside>
      <section className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-2 border-b bg-slate-50 text-xs text-slate-500 flex items-center gap-2">
          <Eye className="h-3.5 w-3.5" /> Превью
        </div>
        <div className="p-8 min-h-[420px] grid place-items-center text-slate-400">
          {site.blocks.length} блоков · тема «{site.theme}»
        </div>
      </section>
    </div>
  )
}
