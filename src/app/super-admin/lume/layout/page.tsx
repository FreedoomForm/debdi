import { LumeSidebar } from '@/lume-modules/03-layout/sidebar'
import { LumeTopbar } from '@/lume-modules/03-layout/topbar'
import { LumeBreadcrumbs } from '@/lume-modules/03-layout/breadcrumbs'

export default function Page() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold p-6 pb-0">Демонстрация Layout</h1>
      <LumeTopbar />
      <LumeBreadcrumbs />
      <p className="p-6 text-sm text-slate-500">
        Боковая панель отображается фиксированно слева. Это превью топбара и хлебных крошек.
      </p>
    </div>
  )
}
