'use client'
import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { fetchSettings, saveSettings, type LumeSettings } from './index'

export function SettingsForm() {
  const [s, setS] = useState<LumeSettings | null>(null)
  const [saving, setSaving] = useState(false)
  useEffect(() => { fetchSettings().then(setS).catch(() => {}) }, [])
  if (!s) return <div className="p-6 text-slate-400">Загрузка…</div>
  const set = (patch: Partial<LumeSettings>) => setS({ ...s, ...patch })
  const onSave = async () => { setSaving(true); await saveSettings(s); setSaving(false) }
  return (
    <div className="space-y-4 p-6 max-w-3xl">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Настройки</h1>
          <p className="text-sm text-slate-500">Бренд, доставка, уведомления, оплата</p>
        </div>
        <button
          onClick={onSave} disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" /> {saving ? 'Сохранение…' : 'Сохранить'}
        </button>
      </header>
      <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-3">
        <h3 className="font-semibold">Бренд</h3>
        <label className="block">
          <span className="text-sm font-medium">Название</span>
          <input
            value={s.branding.name}
            onChange={(e) => set({ branding: { ...s.branding, name: e.target.value } })}
            className="mt-1 block w-full h-10 rounded-lg border border-slate-200 px-3 focus:border-blue-500 outline-none"
          />
        </label>
        <div className="flex gap-3">
          <label className="block flex-1">
            <span className="text-sm font-medium">Основной цвет</span>
            <input
              type="color"
              value={s.branding.primaryColor}
              onChange={(e) => set({ branding: { ...s.branding, primaryColor: e.target.value } })}
              className="mt-1 block w-full h-10 rounded-lg border"
            />
          </label>
          <label className="block flex-1">
            <span className="text-sm font-medium">Акцент</span>
            <input
              type="color"
              value={s.branding.accentColor}
              onChange={(e) => set({ branding: { ...s.branding, accentColor: e.target.value } })}
              className="mt-1 block w-full h-10 rounded-lg border"
            />
          </label>
        </div>
      </section>
      <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-3">
        <h3 className="font-semibold">Доставка</h3>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-medium">Мин. заказ</span>
            <input
              type="number"
              value={s.delivery.minOrder}
              onChange={(e) => set({ delivery: { ...s.delivery, minOrder: +e.target.value } })}
              className="mt-1 block w-full h-10 rounded-lg border border-slate-200 px-3"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Стоимость доставки</span>
            <input
              type="number"
              value={s.delivery.deliveryFee}
              onChange={(e) => set({ delivery: { ...s.delivery, deliveryFee: +e.target.value } })}
              className="mt-1 block w-full h-10 rounded-lg border border-slate-200 px-3"
            />
          </label>
        </div>
      </section>
    </div>
  )
}
