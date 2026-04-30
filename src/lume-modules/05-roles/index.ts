/** Module 05: Roles & Permissions */
export const MODULES = [
  'dashboard','users','roles','products','categories','orders','customers',
  'couriers','warehouse','finance','reports','settings','audit','website','dispatch',
] as const
export const ACTIONS = ['view','create','update','delete','export'] as const
export type Module = typeof MODULES[number]
export type Action = typeof ACTIONS[number]
export type Permission = `${Module}.${Action}`
export const ALL_PERMISSIONS: Permission[] =
  MODULES.flatMap((m) => ACTIONS.map((a) => `${m}.${a}` as Permission))

export type Role = {
  id: string
  name: string
  description?: string
  isSystem: boolean
  permissions: Permission[]
}

export function can(perms: Permission[], required: Permission): boolean {
  return perms.includes(required)
}

export function canAny(perms: Permission[], required: Permission[]): boolean {
  return required.some((r) => perms.includes(r))
}
