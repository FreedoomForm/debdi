/**
 * POS layer — public barrel export.
 *
 * Pure / browser-safe modules ONLY. Server-only files
 * (`escpos-server.ts`) and modules that branch on the runtime
 * (`printer-service.ts`) are deliberately omitted: callers that need
 * those import them by their full path so that webpack tree-shakes
 * them out of client bundles instead of inlining `node:net` reach.
 */
export * from './types'
export * from './cart'
export * from './format'
export * from './barcode'
export * from './escpos'
