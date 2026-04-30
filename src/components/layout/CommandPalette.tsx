'use client'
/**
 * Command palette (Cmd+K).
 *
 * Flat list of every navigable destination across the unified nav, plus
 * quick "verbs" (e.g. open new sale, close shift, print receipt). Built on
 * `cmdk` which is already a project dependency.
 *
 * The palette is mounted by `UnifiedShell` and toggled with Cmd/Ctrl+K.
 */
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import {
  Plus,
  Receipt,
  Printer,
  Clock,
  LogOut,
  Sparkles,
} from 'lucide-react'
import { NAV } from '@/lib/nav/structure'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')

  // Reset search when dialog closes.
  useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  const allItems = useMemo(() => {
    const out: Array<{
      sectionLabel: string
      label: string
      desc?: string
      href: string
      icon: any
    }> = []
    for (const s of NAV) {
      for (const c of s.children) {
        out.push({
          sectionLabel: s.label,
          label: c.label,
          desc: c.desc,
          href: c.href,
          icon: c.icon,
        })
      }
    }
    return out
  }, [])

  const go = (href: string) => {
    onOpenChange(false)
    router.push(href)
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Поиск или быстрая команда…"
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>Ничего не найдено.</CommandEmpty>
        <CommandGroup heading="Быстрые действия">
          <CommandItem onSelect={() => go('/pos/terminal')}>
            <Plus className="mr-2 h-4 w-4" />
            Новый заказ
            <CommandShortcut>⌘ N</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go('/pos/orders')}>
            <Receipt className="mr-2 h-4 w-4" />
            Открыть журнал заказов
          </CommandItem>
          <CommandItem onSelect={() => go('/pos/printers')}>
            <Printer className="mr-2 h-4 w-4" />
            Управление принтерами
          </CommandItem>
          <CommandItem onSelect={() => go('/pos/shift')}>
            <Clock className="mr-2 h-4 w-4" />
            Открыть / закрыть смену
          </CommandItem>
          <CommandItem onSelect={() => go('/pos/dashboard')}>
            <Sparkles className="mr-2 h-4 w-4" />
            Перейти на дашборд
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        {NAV.map((section) => (
          <CommandGroup key={section.id} heading={section.label}>
            {section.children.map((c) => {
              const Icon = c.icon
              return (
                <CommandItem
                  key={c.id}
                  value={`${section.label} ${c.label} ${c.desc ?? ''}`}
                  onSelect={() => go(c.href)}
                >
                  <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{c.label}</div>
                    {c.desc && (
                      <div className="truncate text-[11px] text-muted-foreground">
                        {c.desc}
                      </div>
                    )}
                  </div>
                </CommandItem>
              )
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  )
}

// Re-export the shadcn-style Command primitives if they are missing —
// the project's `src/components/ui/command.tsx` already provides them,
// but we silence unused-import lints by referencing here.
void Command
