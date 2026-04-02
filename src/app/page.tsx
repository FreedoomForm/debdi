'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import { ArrowRight, CheckCircle2, Globe2, Layers3, Route, ShieldCheck, WalletCards, Sparkles, Star, Zap } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useLanguage } from '@/contexts/LanguageContext'

const localized = {
  en: {
    platform: 'Operations platform',
    adminLogin: 'Admin login',
    openDashboard: 'Open dashboard',
    heroTag: 'Delivery operations system',
    heroTitle: 'One system for orders, clients, couriers, finance, and client-facing subdomain sites.',
    heroDescription:
      'AutoFood is built for teams that need stable daily execution without switching between disconnected tools.',
    portalTitle: 'Client portal and subdomain sites are connected to the same data.',
    portalLabel: 'Client portal',
    portalDescription:
      'Customers can check plans, balances, menus, and order history while admins manage the same records in one workspace.',
    roleTitle: 'Each role sees the right level of complexity.',
    roleBadge: 'Role-based access',
    pricingTitle: 'Simple pricing, practical rollout.',
    pricingDescription:
      'Start with core operations, then expand into route optimization, AI workflows, and customer web access.',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    monthlyNote: 'For teams validating workflow.',
    quarterlyNote: 'For teams with stable operating cadence.',
    footerCta: 'Ready to streamline your delivery operations?',
    footerCtaButton: 'Get started today',
    stats: [
      { label: 'Admin roles', value: '4' },
      { label: 'Core workspaces', value: 'Orders, clients, couriers' },
      { label: 'Client access', value: 'Portal + subdomain' },
      { label: 'Operational rhythm', value: 'Daily' },
    ],
    points: [
      {
        title: 'Dispatch visibility',
        detail: 'Track stages, courier workload, and bottlenecks in one place.',
        icon: Route,
      },
      {
        title: 'Connected client lifecycle',
        detail: 'Profiles, balances, plans, and history stay in one workflow.',
        icon: Layers3,
      },
      {
        title: 'Daily finance clarity',
        detail: 'Debt, balance, and totals stay visible before issues grow.',
        icon: WalletCards,
      },
    ],
    promises: [
      'Operational dashboards designed for daily use',
      'Client subdomain websites connected to admin data',
      'AI workflow for files, exports, and website edits',
      'Role-based routing with clearer navigation',
      'PWA-ready mobile usage for admin and courier',
      'Unified data workspace for daily operations',
    ],
    roles: [
      {
        title: 'Super Admin',
        detail: 'Controls permissions, admin structure, and system governance.',
      },
      {
        title: 'Middle Admin',
        detail: 'Runs orders, clients, dispatch, history, and finance.',
      },
      {
        title: 'Low Admin',
        detail: 'Works with a focused toolset under scoped access.',
      },
      {
        title: 'Courier',
        detail: 'Receives route-ready delivery actions with fast status updates.',
      },
    ],
  },
  uz: {
    platform: 'Operatsion platforma',
    adminLogin: 'Admin kirish',
    openDashboard: 'Panelni ochish',
    heroTag: 'Yetkazib berish boshqaruvi tizimi',
    heroTitle: 'Buyurtma, mijoz, kuryer, moliya va mijoz subdomain saytlari uchun yagona tizim.',
    heroDescription:
      'AutoFood kundalik ishni barqaror yuritish uchun yaratilgan, ortiqcha tizimlar orasida almashishga hojat yoq.',
    portalTitle: 'Mijoz portali va subdomain saytlar bir xil malumotlar bilan ishlaydi.',
    portalLabel: 'Mijoz portali',
    portalDescription:
      'Mijozlar reja, balans, menyu va tarixni koradi, admin esa shu malumotlarni bitta joydan boshqaradi.',
    roleTitle: 'Har bir rol oziga kerakli darajadagi interfeysni koradi.',
    roleBadge: 'Rol asosidagi kirish',
    pricingTitle: 'Oddiy narx, amaliy joriy qilish.',
    pricingDescription:
      'Asosiy jarayondan boshlang, keyin marshrut optimizatsiyasi, AI va mijoz web kirishini yoqing.',
    monthly: 'Oylik',
    quarterly: 'Choraklik',
    monthlyNote: 'Jarayonni tekshirayotgan jamoalar uchun.',
    quarterlyNote: 'Barqaror ishlayotgan jamoalar uchun.',
    footerCta: 'Yetkazib berish jarayonini soddalashtirmoqchimisiz?',
    footerCtaButton: 'Bugun boshlang',
    stats: [
      { label: 'Admin rollari', value: '4' },
      { label: 'Asosiy bolimlar', value: 'Buyurtma, mijoz, kuryer' },
      { label: 'Mijoz kirishi', value: 'Portal + subdomain' },
      { label: 'Ish ritmi', value: 'Har kun' },
    ],
    points: [
      {
        title: 'Dispecher nazorati',
        detail: 'Bosqichlar, kuryer yuklamasi va kechikishlar bitta oynada.',
        icon: Route,
      },
      {
        title: 'Mijoz jarayoni bir joyda',
        detail: 'Profil, balans, reja va tarix uzilmasdan yuritiladi.',
        icon: Layers3,
      },
      {
        title: 'Kundalik moliya aniqligi',
        detail: 'Qarzdorlik va balanslar vaqtida korinib turadi.',
        icon: WalletCards,
      },
    ],
    promises: [
      'Kundalik ish uchun qulay boshqaruv oynalari',
      'Admin malumotlari bilan boglangan mijoz saytlari',
      'Fayl va sayt ishlari uchun AI ish jarayoni',
      'Tushunarli rol asosidagi navigatsiya',
      'Admin va kuryer uchun PWA mobil tayyorlik',
      'Kundalik boshqaruv uchun yagona malumot maydoni',
    ],
    roles: [
      {
        title: 'Super Admin',
        detail: 'Ruxsatlar, admin tuzilmasi va tizim nazoratini boshqaradi.',
      },
      {
        title: 'Middle Admin',
        detail: 'Buyurtma, mijoz, dispecher, tarix va moliyani yuritadi.',
      },
      {
        title: 'Low Admin',
        detail: 'Cheklangan kirish bilan kerakli vositalarda ishlaydi.',
      },
      {
        title: 'Kuryer',
        detail: 'Yetkazish uchun tayyor topshiriqlar va tez holat yangilashni oladi.',
      },
    ],
  },
  ru: {
    platform: 'Операционная платформа',
    adminLogin: 'Вход для админа',
    openDashboard: 'Открыть панель',
    heroTag: 'Система управления доставкой',
    heroTitle: 'Единая система для заказов, клиентов, курьеров, финансов и клиентских subdomain-сайтов.',
    heroDescription:
      'AutoFood помогает команде стабильно работать каждый день без переключения между разными инструментами.',
    portalTitle: 'Клиентский портал и subdomain-сайты работают на тех же данных.',
    portalLabel: 'Клиентский портал',
    portalDescription:
      'Клиенты видят планы, баланс, меню и историю, а админ управляет теми же записями в одном месте.',
    roleTitle: 'Каждая роль получает нужный уровень сложности интерфейса.',
    roleBadge: 'Ролевой доступ',
    pricingTitle: 'Простая цена и поэтапный запуск.',
    pricingDescription:
      'Начните с базовых процессов, затем подключайте оптимизацию маршрутов, AI и веб-доступ для клиентов.',
    monthly: 'Ежемесячно',
    quarterly: 'Поквартально',
    monthlyNote: 'Для команд, которые проверяют процесс.',
    quarterlyNote: 'Для команд со стабильным рабочим циклом.',
    footerCta: 'Готовы оптимизировать доставку?',
    footerCtaButton: 'Начать сегодня',
    stats: [
      { label: 'Ролей админа', value: '4' },
      { label: 'Основные разделы', value: 'Заказы, клиенты, курьеры' },
      { label: 'Доступ клиента', value: 'Портал + subdomain' },
      { label: 'Ритм работы', value: 'Ежедневно' },
    ],
    points: [
      {
        title: 'Прозрачная диспетчеризация',
        detail: 'Статусы, загрузка курьеров и узкие места видны в одном месте.',
        icon: Route,
      },
      {
        title: 'Цикл клиента без разрывов',
        detail: 'Профили, баланс, планы и история связаны в одном процессе.',
        icon: Layers3,
      },
      {
        title: 'Финансы под контролем',
        detail: 'Долги, баланс и суммы видны до появления проблем.',
        icon: WalletCards,
      },
    ],
    promises: [
      'Операционные панели для реальной ежедневной работы',
      'Клиентские сайты с данными из админ-системы',
      'AI-поток для файлов, экспортов и правок сайта',
      'Ролевая навигация без лишних экранов',
      'PWA-режим для админа и курьера на мобильных',
      'Единое пространство данных для ежедневной работы',
    ],
    roles: [
      {
        title: 'Супер-админ',
        detail: 'Управляет правами, структурой админов и общим контролем системы.',
      },
      {
        title: 'Средний админ',
        detail: 'Ведет заказы, клиентов, маршруты, историю и финансы.',
      },
      {
        title: 'Низкий админ',
        detail: 'Работает в пределах назначенных прав с нужным набором инструментов.',
      },
      {
        title: 'Курьер',
        detail: 'Получает готовые задачи по доставке и быстро обновляет статусы.',
      },
    ],
  },
} as const

function AnimatedNumber({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  
  return (
    <span ref={ref} className={className}>
      {isInView ? (
        <motion.span
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {value}
        </motion.span>
      ) : value}
    </span>
  )
}

/* ── Animation variants ── */
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}

export default function LandingPage() {
  const { t, language } = useLanguage()
  const copy = localized[language]
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const trustItems = [
    { icon: ShieldCheck, text: 'Secure & encrypted' },
    { icon: Zap, text: 'Real-time sync' },
    { icon: Star, text: 'PWA ready' },
  ]

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      {/* Subtle top gradient — performant, no blur */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[28rem] bg-hero-gradient" />

      {/* ══════════════════ Header ══════════════════ */}
      <motion.header
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none fixed left-0 right-0 top-0 z-50 flex justify-center px-4 pt-4"
      >
        <div
          className={`pointer-events-auto flex w-full max-w-5xl items-center justify-between rounded-xl border border-border px-4 py-2.5 transition-all duration-200 ${
            scrolled
              ? 'bg-card shadow-[var(--shadow-md)]'
              : 'bg-card/80 shadow-[var(--shadow-sm)]'
          }`}
        >
          <Link href="/" className="group flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow-[var(--shadow-xs)] transition-transform duration-150 group-hover:scale-105 dark:bg-main dark:text-main-foreground">
              AF
            </div>
            <span className="text-[15px] font-bold tracking-tight">AutoFood</span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link href="/login">
              <Button variant="ghost" size="sm">{copy.adminLogin}</Button>
            </Link>
          </div>
        </div>
      </motion.header>

      {/* ══════════════════ Main Content ══════════════════ */}
      <main className="relative z-10 mx-auto max-w-5xl space-y-16 px-4 pb-14 pt-32 sm:space-y-20 sm:pt-36">

        {/* ── Hero ── */}
        <motion.section
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="mx-auto flex max-w-3xl flex-col items-center text-center"
        >
          <motion.div
            variants={fadeUp}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold text-muted-foreground shadow-[var(--shadow-xs)]"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary dark:text-main" />
            <span>{copy.heroTag}</span>
          </motion.div>

          <motion.h1 variants={fadeUp} className="mb-5 text-display text-balance">
            {copy.heroTitle}
          </motion.h1>

          <motion.p variants={fadeUp} className="mb-8 max-w-2xl text-balance text-body-lg text-muted-foreground">
            {copy.heroDescription}
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-3">
            <Link href="/login">
              <Button size="lg">
                {(t.common as any)?.login || copy.adminLogin} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-10 flex flex-wrap items-center justify-center gap-2">
            {trustItems.map((item) => (
              <div key={item.text} className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-[var(--shadow-xs)]">
                <item.icon className="h-3.5 w-3.5" />
                <span>{item.text}</span>
              </div>
            ))}
          </motion.div>
        </motion.section>

        {/* ── Features grid ── */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={staggerContainer}
          className="grid gap-4 md:grid-cols-3"
        >
          {copy.points.map((item) => {
            const Icon = item.icon
            return (
              <motion.div
                key={item.title}
                variants={fadeUp}
                className="group rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-sm)] transition-all duration-200 hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/8 text-primary dark:bg-main/10 dark:text-main">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mb-1.5 text-base font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.detail}</p>
              </motion.div>
            )
          })}
        </motion.section>

        {/* ── Portal + Stats ── */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={staggerContainer}
          className="grid gap-4 lg:grid-cols-[1.2fr_1fr]"
        >
          <motion.div variants={fadeUp} className="rounded-xl border border-border bg-card p-7 shadow-[var(--shadow-sm)]">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
              <Globe2 className="h-3.5 w-3.5" />
              <span>{copy.portalLabel}</span>
            </div>
            <h2 className="mt-4 max-w-[90%] text-headline leading-tight">{copy.portalTitle}</h2>
            <p className="mb-6 mt-2.5 max-w-xl text-body-sm text-muted-foreground">{copy.portalDescription}</p>
            <div className="space-y-2.5">
              {copy.promises.slice(0, 3).map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-main/10 dark:text-main">
                    <CheckCircle2 className="h-3 w-3" />
                  </div>
                  <span className="text-sm text-foreground">{item}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3">
            {copy.stats.map((stat) => (
              <div key={stat.label} className="flex flex-col justify-center rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-sm)]">
                <AnimatedNumber value={stat.value} className="mb-1 block text-2xl font-bold tracking-tight md:text-3xl" />
                <p className="text-overline">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </motion.section>

        {/* ── Roles + Pricing ── */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={staggerContainer}
          className="grid gap-4 lg:grid-cols-[1fr_1fr]"
        >
          {/* Roles */}
          <motion.div variants={fadeUp} className="flex flex-col rounded-xl border border-border bg-card p-7 shadow-[var(--shadow-sm)]">
            <div className="mb-6">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <ShieldCheck className="h-3 w-3" />
                {copy.roleBadge}
              </div>
              <h2 className="text-title">{copy.roleTitle}</h2>
            </div>
            <div className="grid flex-1 gap-2.5">
              {copy.roles.map((role, i) => (
                <div key={role.title} className="rounded-lg border border-border bg-secondary/50 p-4 transition-colors duration-150 hover:bg-secondary">
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-xs font-bold text-primary dark:bg-main/10 dark:text-main">
                      {i + 1}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold">{role.title}</h4>
                      <p className="mt-0.5 text-[13px] text-muted-foreground leading-snug">{role.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Pricing */}
          <motion.div variants={fadeUp} className="flex flex-col justify-between rounded-xl border border-border bg-card p-7 shadow-[var(--shadow-sm)]">
            <div>
              <h2 className="max-w-[85%] text-title">{copy.pricingTitle}</h2>
              <p className="mb-7 mt-2 max-w-sm text-body-sm text-muted-foreground">{copy.pricingDescription}</p>
            </div>
            <div className="space-y-3">
              {/* Monthly */}
              <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 p-5">
                <div className="min-w-0 pr-4">
                  <h4 className="text-base font-semibold">{copy.monthly}</h4>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">{copy.monthlyNote}</p>
                </div>
                <div className="shrink-0 text-2xl font-bold tracking-tight">$100</div>
              </div>
              {/* Quarterly — highlighted */}
              <div className="flex items-center justify-between rounded-lg border-2 border-primary bg-primary/5 p-5 dark:border-main dark:bg-main/5">
                <div className="min-w-0 pr-4">
                  <h4 className="flex items-center gap-2 text-base font-semibold">
                    {copy.quarterly}
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground dark:bg-main dark:text-main-foreground">
                      Popular
                    </span>
                  </h4>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">{copy.quarterlyNote}</p>
                </div>
                <div className="shrink-0 text-2xl font-bold tracking-tight">$200</div>
              </div>
            </div>
          </motion.div>
        </motion.section>

        {/* ── CTA ── */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={staggerContainer}
          className="relative"
        >
          <motion.div variants={fadeUp} className="rounded-xl border border-primary/20 bg-primary p-10 text-center text-primary-foreground shadow-[var(--shadow-lg)] dark:bg-main dark:text-main-foreground dark:border-main/20 md:p-14">
            <h2 className="mb-4 text-headline">{copy.footerCta}</h2>
            <Link href="/login">
              <Button variant="outline" className="mt-2 h-11 bg-card px-7 text-foreground border-border shadow-[var(--shadow-sm)]">
                {copy.footerCtaButton} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
          <div className="mt-10 text-center text-xs text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} AutoFood. All rights reserved.</p>
          </div>
        </motion.section>
      </main>
    </div>
  )
}
