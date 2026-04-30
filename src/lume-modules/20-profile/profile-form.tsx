'use client'
import { useEffect, useState } from 'react'
import { User, Lock } from 'lucide-react'
import { fetchProfile, updateProfile, changePassword } from './index'

export function ProfileForm() {
  const [profile, setProfile] = useState<any>(null)
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' })
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => { fetchProfile().then(setProfile).catch(() => {}) }, [])
  if (!profile) return <div className="p-6 text-slate-400">Загрузка…</div>
  const set = (k: string, v: string) => setProfile({ ...profile, [k]: v })
  return (
    <div className="space-y-4 p-6 max-w-3xl">
      <header>
        <h1 className="text-2xl font-bold">Мой профиль</h1>
        <p className="text-sm text-slate-500">Личные данные и безопасность</p>
      </header>
      <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-3">
        <h3 className="font-semibold flex items-center gap-2"><User className="h-4 w-4" /> Данные</h3>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-medium">Имя</span>
            <input value={profile.firstName ?? ''} onChange={(e) => set('firstName', e.target.value)}
              className="mt-1 block w-full h-10 rounded-lg border border-slate-200 px-3" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Фамилия</span>
            <input value={profile.lastName ?? ''} onChange={(e) => set('lastName', e.target.value)}
              className="mt-1 block w-full h-10 rounded-lg border border-slate-200 px-3" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Email</span>
            <input value={profile.email ?? ''} onChange={(e) => set('email', e.target.value)}
              className="mt-1 block w-full h-10 rounded-lg border border-slate-200 px-3" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Телефон</span>
            <input value={profile.phone ?? ''} onChange={(e) => set('phone', e.target.value)}
              className="mt-1 block w-full h-10 rounded-lg border border-slate-200 px-3" />
          </label>
        </div>
        <button
          onClick={() => updateProfile(profile)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >Сохранить</button>
      </section>
      <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-3">
        <h3 className="font-semibold flex items-center gap-2"><Lock className="h-4 w-4" /> Сменить пароль</h3>
        <div className="grid grid-cols-3 gap-3">
          <input type="password" placeholder="Текущий" value={pwd.current}
            onChange={(e) => setPwd({ ...pwd, current: e.target.value })}
            className="h-10 rounded-lg border border-slate-200 px-3" />
          <input type="password" placeholder="Новый" value={pwd.next}
            onChange={(e) => setPwd({ ...pwd, next: e.target.value })}
            className="h-10 rounded-lg border border-slate-200 px-3" />
          <input type="password" placeholder="Подтвердить" value={pwd.confirm}
            onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })}
            className="h-10 rounded-lg border border-slate-200 px-3" />
        </div>
        {msg && <div className="text-sm text-emerald-600">{msg}</div>}
        <button
          onClick={async () => {
            try {
              if (pwd.next !== pwd.confirm) { setMsg('Пароли не совпадают'); return }
              await changePassword(pwd.current, pwd.next)
              setMsg('Пароль обновлён')
              setPwd({ current: '', next: '', confirm: '' })
            } catch { setMsg('Ошибка смены пароля') }
          }}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
        >Обновить пароль</button>
      </section>
    </div>
  )
}
