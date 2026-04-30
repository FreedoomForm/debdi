'use client'
/**
 * Camera-based barcode scanner.
 *
 * Uses the native BarcodeDetector API where available (Chrome / Edge / Samsung
 * Internet on Android, recent Safari). Falls back to manual entry if the
 * browser doesn't support it.
 *
 * Triggered by a global `pos:open-camera-scanner` event so that any component
 * (e.g. ProductGrid's barcode button) can open it without prop-drilling.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, X, RefreshCw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

declare global {
  interface Window {
    BarcodeDetector?: new (opts: { formats: string[] }) => {
      detect(source: HTMLVideoElement | ImageBitmap): Promise<
        Array<{ rawValue: string; format: string }>
      >
    }
  }
}

type Props = {
  onScan: (code: string) => void
}

export function CameraScanner({ onScan }: Props) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [manualValue, setManualValue] = useState('')
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectorRef = useRef<InstanceType<NonNullable<Window['BarcodeDetector']>> | null>(
    null
  )
  const rafRef = useRef<number | null>(null)

  // Listen to global open event.
  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener('pos:open-camera-scanner', handler)
    return () => window.removeEventListener('pos:open-camera-scanner', handler)
  }, [])

  const stop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  const start = useCallback(async () => {
    setError(null)
    try {
      if (!('BarcodeDetector' in window)) {
        setError(
          'Ваш браузер не поддерживает встроенный сканер штрихкодов. Введите код вручную.'
        )
      } else {
        detectorRef.current = new window.BarcodeDetector!({
          formats: [
            'ean_13',
            'ean_8',
            'upc_a',
            'upc_e',
            'code_128',
            'code_39',
            'qr_code',
            'pdf417',
          ],
        })
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      tick()
    } catch (err) {
      setError(
        err instanceof Error
          ? `Не удалось получить доступ к камере: ${err.message}`
          : 'Не удалось получить доступ к камере'
      )
    }
  }, [])

  const tick = useCallback(() => {
    if (!detectorRef.current || !videoRef.current) {
      rafRef.current = requestAnimationFrame(tick)
      return
    }
    detectorRef.current
      .detect(videoRef.current)
      .then((results) => {
        if (results.length > 0) {
          const code = results[0].rawValue
          stop()
          setOpen(false)
          onScan(code)
        }
      })
      .catch(() => {
        /* ignore single-frame errors */
      })
      .finally(() => {
        rafRef.current = requestAnimationFrame(tick)
      })
  }, [onScan, stop])

  useEffect(() => {
    if (open) {
      start()
    } else {
      stop()
    }
    return () => stop()
  }, [open, start, stop])

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualValue.trim()) {
      onScan(manualValue.trim())
      setManualValue('')
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Сканер штрихкода
          </DialogTitle>
        </DialogHeader>
        <div className="relative aspect-square overflow-hidden rounded-lg bg-black">
          <video
            ref={videoRef}
            playsInline
            muted
            className="h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-1/2 w-3/4 rounded-lg border-2 border-dashed border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </div>
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/95 p-4 text-center text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <form
          onSubmit={handleManualSubmit}
          className="flex items-center gap-2"
        >
          <Input
            value={manualValue}
            onChange={(e) => setManualValue(e.target.value)}
            placeholder="Или введите код вручную"
            className="flex-1"
          />
          <Button type="submit" disabled={!manualValue.trim()}>
            ОК
          </Button>
        </form>

        <div className="flex justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => start()}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Перезапустить
          </Button>
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            <X className="mr-1.5 h-3.5 w-3.5" />
            Закрыть
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
