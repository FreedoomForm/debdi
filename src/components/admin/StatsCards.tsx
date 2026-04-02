'use client'

import { Users, TrendingUp, Clock, Truck } from 'lucide-react'
import { motion, type Variants } from 'framer-motion'

interface Stats {
    successfulOrders: number
    failedOrders: number
    pendingOrders: number
    inDeliveryOrders: number
    dailyCustomers: number
}

interface StatsCardsProps {
    stats: Stats | null
}

const cardMeta = [
    {
        title: 'Успешные заказы',
        key: 'successfulOrders' as const,
        description: 'Доставлено',
        Icon: TrendingUp,
        gradient: 'from-emerald-500/20 to-emerald-500/5',
        iconGradient: 'from-emerald-400 to-emerald-600',
        accentColor: 'text-emerald-600 dark:text-emerald-400',
        glowColor: 'rgba(52, 211, 153, 0.15)',
    },
    {
        title: 'В доставке',
        key: 'inDeliveryOrders' as const,
        description: 'Активные сейчас',
        Icon: Truck,
        gradient: 'from-blue-500/20 to-blue-500/5',
        iconGradient: 'from-blue-400 to-blue-600',
        accentColor: 'text-blue-600 dark:text-blue-400',
        glowColor: 'rgba(96, 165, 250, 0.15)',
    },
    {
        title: 'Клиенты',
        key: 'dailyCustomers' as const,
        description: 'Ежедневные подписки',
        Icon: Users,
        gradient: 'from-violet-500/20 to-violet-500/5',
        iconGradient: 'from-violet-400 to-violet-600',
        accentColor: 'text-violet-600 dark:text-violet-400',
        glowColor: 'rgba(167, 139, 250, 0.15)',
    },
    {
        title: 'Ожидают',
        key: 'pendingOrders' as const,
        description: 'В очереди',
        Icon: Clock,
        gradient: 'from-amber-500/20 to-amber-500/5',
        iconGradient: 'from-amber-400 to-amber-600',
        accentColor: 'text-amber-600 dark:text-amber-400',
        glowColor: 'rgba(251, 191, 36, 0.15)',
    },
] as const

const container: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.08, delayChildren: 0.1 }
    }
}

const item: Variants = {
    hidden: { opacity: 0, y: 16, scale: 0.95 },
    show: { 
        opacity: 1, y: 0, scale: 1,
        transition: { type: 'spring', stiffness: 300, damping: 24 }
    }
}

export function StatsCards({ stats }: StatsCardsProps) {
    return (
        <motion.div 
            className="grid gap-4 grid-cols-2 lg:grid-cols-4"
            variants={container}
            initial="hidden"
            animate="show"
        >
            {cardMeta.map(({ title, key, description, Icon, gradient, iconGradient, accentColor, glowColor }) => (
                <motion.div
                    key={title}
                    variants={item}
                    className="group relative overflow-hidden rounded-2xl border border-black/5 dark:border-white/[0.06] bg-white/60 dark:bg-white/[0.02] p-5 backdrop-blur-xl transition-all duration-500 hover:border-black/10 dark:hover:border-white/[0.12] hover:bg-white/80 dark:hover:bg-white/[0.04] hover:shadow-md dark:hover:shadow-[0_8px_40px_-8px_rgba(0,0,0,0.4)]"
                >
                    {/* Gradient glow on hover */}
                    <div 
                        className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-700`} 
                    />
                    {/* Subtle glow orb */}
                    <div 
                        className="absolute -top-8 -right-8 h-24 w-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl"
                        style={{ background: glowColor }}
                    />
                    
                    <div className="relative z-10">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-zinc-500 dark:text-white/45 tracking-wide">{title}</span>
                            <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${iconGradient} shadow-md dark:shadow-lg transition-all duration-500 group-hover:scale-110 group-hover:shadow-xl`}>
                                <Icon className="h-4 w-4 text-white" aria-hidden="true" />
                            </div>
                        </div>
                        <div className={`mt-4 text-3xl font-bold ${accentColor} tracking-tight`}>
                            {stats?.[key] ?? 0}
                        </div>
                        <p className="mt-1 text-[11px] text-zinc-400 dark:text-white/35 font-medium dark:font-light">{description}</p>
                    </div>
                </motion.div>
            ))}
        </motion.div>
    )
}
