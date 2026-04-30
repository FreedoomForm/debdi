'use client'
import { useState } from 'react'
import { PermissionMatrix } from '@/lume-modules/05-roles/permission-matrix'
import { ALL_PERMISSIONS, type Permission } from '@/lume-modules/05-roles'

export default function Page() {
  const [perms, setPerms] = useState<Permission[]>(ALL_PERMISSIONS.slice(0, 10))
  return (
    <div className="p-6 space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Роли и права</h1>
        <p className="text-sm text-slate-500">Настройте матрицу прав для ролей</p>
      </header>
      <PermissionMatrix value={perms} onChange={setPerms} />
    </div>
  )
}
