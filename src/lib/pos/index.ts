/**
 * POS layer — public barrel export.
 * All POS-specific helpers, math, types, and integrations live under
 * `src/lib/pos/*` and are re-exported here for convenience.
 */
export * from './types'
export * from './cart'
export * from './format'
export * from './barcode'
export * from './escpos'
export * from './printer-service'
