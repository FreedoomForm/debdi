/** Module 21: Website Builder (per-tenant subdomain sites) */
export type WebsiteBlock = {
  id: string
  type: 'hero' | 'menu' | 'about' | 'contacts' | 'testimonials' | 'gallery' | 'cta' | 'footer'
  data: Record<string, unknown>
  order: number
}

export type WebsiteSettings = {
  subdomain: string
  title: string
  description: string
  theme: 'minimal' | 'gourmet' | 'vibrant' | 'classic'
  primaryColor: string
  blocks: WebsiteBlock[]
  seo: { title: string; description: string; ogImage?: string }
}

export async function fetchWebsite(subdomain: string) {
  const r = await fetch(`/api/sites/${subdomain}`)
  return r.json()
}

export async function saveWebsite(subdomain: string, settings: Partial<WebsiteSettings>) {
  const r = await fetch(`/api/admin/website?subdomain=${subdomain}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(settings),
  })
  return r.json()
}

export async function aiEditWebsite(subdomain: string, prompt: string) {
  const r = await fetch('/api/admin/website/ai-edit', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ subdomain, prompt }),
  })
  return r.json()
}
