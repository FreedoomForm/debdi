'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'
import { LoginSchema, type LoginInput } from './index'

export function LumeLoginForm() {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [showPwd, setShowPwd] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({})

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErr(null)
    setFieldErr({})
    const fd = new FormData(e.currentTarget)
    const payload: LoginInput = {
      identifier: String(fd.get('identifier') || ''),
      password: String(fd.get('password') || ''),
      remember: fd.get('remember') === 'on',
    }
    const parsed = LoginSchema.safeParse(payload)
    if (!parsed.success) {
      const fe: Record<string, string> = {}
      parsed.error.issues.forEach((i) => {
        fe[String(i.path[0])] = i.message
      })
      setFieldErr(fe)
      return
    }
    start(async () => {
      try {
        const r = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(parsed.data),
        })
        const data = await r.json()
        if (!r.ok || !data.ok) {
          setErr(data.error || 'Ошибка входа')
          return
        }
        router.push(data.redirect || '/')
        router.refresh()
      } catch {
        setErr('Сервер недоступен')
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-[420px] space-y-5">
      <header className="space-y-2">
        <div className="text-blue-600 font-bold tracking-[0.18em] text-sm">DEBDI · LUME</div>
        <h1 className="text-[28px] font-bold leading-tight">Добро пожаловать</h1>
        <p className="text-slate-500 text-sm">Войдите в административную систему</p>
      </header>

      {err && (
        <div role="alert" className="flex gap-2 items-start rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{err}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Email или телефон</label>
        <input
          name="identifier"
          autoFocus
          autoComplete="username"
          className={`w-full h-12 rounded-xl border px-4 text-[15px] outline-none transition ${
            fieldErr.identifier
              ? 'border-red-300 focus:border-red-500'
              : 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
          }`}
          placeholder="point@indev.uz"
        />
        {fieldErr.identifier && <p className="text-xs text-red-600">{fieldErr.identifier}</p>}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Пароль</label>
        <div className="relative">
          <input
            name="password"
            type={showPwd ? 'text' : 'password'}
            autoComplete="current-password"
            className={`w-full h-12 rounded-xl border px-4 pr-11 text-[15px] outline-none transition ${
              fieldErr.password
                ? 'border-red-300'
                : 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
            }`}
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
          >
            {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {fieldErr.password && <p className="text-xs text-red-600">{fieldErr.password}</p>}
      </div>

      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" name="remember" className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
          <span>Запомнить меня</span>
        </label>
        <Link href="/forgot-password" className="text-blue-600 font-medium hover:underline">
          Забыли пароль?
        </Link>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full h-12 rounded-xl bg-blue-600 text-white font-semibold shadow-[0_8px_24px_rgba(37,99,235,0.25)] hover:bg-blue-700 active:scale-[0.99] transition disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {pending && <Loader2 className="w-4 h-4 animate-spin" />}
        Войти
      </button>
    </form>
  )
}
