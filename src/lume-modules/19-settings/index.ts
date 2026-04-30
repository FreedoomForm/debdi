/** Module 19: System Settings */
export type LumeSettings = {
  branding: {
    name: string
    logoUrl?: string
    primaryColor: string
    accentColor: string
  }
  delivery: {
    minOrder: number
    deliveryFee: number
    freeDeliveryFrom: number
    workingHours: { from: string; to: string }
  }
  notifications: {
    emailEnabled: boolean
    smsEnabled: boolean
    pushEnabled: boolean
    telegramBotToken?: string
  }
  payment: {
    methods: ('cash' | 'card' | 'click' | 'payme' | 'apelsin')[]
    currency: string
  }
  language: 'ru' | 'uz' | 'en'
}

export async function fetchSettings(): Promise<LumeSettings> {
  const r = await fetch('/api/admin/settings')
  return r.json()
}

export async function saveSettings(s: Partial<LumeSettings>) {
  const r = await fetch('/api/admin/settings', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(s),
  })
  return r.json()
}
