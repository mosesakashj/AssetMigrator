import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { ScanLine, Sparkles } from 'lucide-react'
import { MOCK_BARCODE_DB } from '../../types/asset'
import { analyzeAssetPhoto } from '../../services/aiService'
import type { AssetFields, AIRecognitionResult } from '../../types/asset'

export type CaptureMode = 'scan' | 'photo'

export interface UnifiedCaptureHandle {
  triggerCapture: () => void
}

interface Props {
  onBarcodeMatch: (fields: Partial<AssetFields>, barcode: string) => void
  onBarcodeNoMatch: (code: string) => void
  onPhotoResult: (result: AIRecognitionResult, imageBase64: string) => void
  onPhotoError: (msg: string) => void
  onModeChange?: (mode: CaptureMode) => void
}

export const UnifiedCaptureView = forwardRef<UnifiedCaptureHandle, Props>(function UnifiedCaptureView(
  { onBarcodeMatch, onBarcodeNoMatch, onPhotoResult, onPhotoError, onModeChange },
  ref
) {
  const [mode, setMode] = useState<CaptureMode>('scan')
  const [scanning, setScanning] = useState(false)
  const [matchedBarcode, setMatchedBarcode] = useState<string | null>(null)
  const [scanError, setScanError] = useState('')
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const SCANNER_DIV = 'unified-scanner-div'

  // ── auto-start barcode scanner on mount ───────────────────────────
  useEffect(() => {
    startScan()
    return () => { try { scannerRef.current?.stop().catch(() => {}) } catch {} }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function switchMode(m: CaptureMode) {
    if (m === mode) return
    if (scanning) { try { scannerRef.current?.stop().catch(() => {}) } catch {}; setScanning(false) }
    setMatchedBarcode(null)
    setScanError('')
    setPhotoPreview(null)
    setMode(m)
    onModeChange?.(m)
    if (m === 'scan') setTimeout(startScan, 100) // brief delay for DOM
  }

  // ── Barcode ───────────────────────────────────────────────────────
  async function startScan() {
    setScanError('')
    try {
      const scanner = new Html5Qrcode(SCANNER_DIV)
      scannerRef.current = scanner
      setScanning(true)
      setMatchedBarcode(null)
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 200, height: 120 } },
        (code) => {
          try { scanner.stop().catch(() => {}) } catch {}
          setScanning(false)
          setMatchedBarcode(code)
          const match = MOCK_BARCODE_DB[code]
          if (match) onBarcodeMatch(match, code)
          else onBarcodeNoMatch(code)
        },
        () => {}
      )
    } catch {
      setScanning(false)
      setScanError('Camera access denied.')
    }
  }

  function stopScan() {
    try { scannerRef.current?.stop().catch(() => {}) } catch {}
    setScanning(false)
  }

  // ── Photo AI ──────────────────────────────────────────────────────
  async function handlePhotoFile(file: File) {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string
      const base64 = dataUrl.split(',')[1]
      setPhotoPreview(dataUrl)
      setAnalyzing(true)
      try {
        const result = await analyzeAssetPhoto(base64, file.type as 'image/jpeg')
        onPhotoResult(result, base64)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'AI analysis failed'
        onPhotoError(msg.includes('API_KEY') ? 'Add VITE_ANTHROPIC_API_KEY to .env to enable AI.' : msg)
      } finally {
        setAnalyzing(false)
      }
    }
    reader.readAsDataURL(file)
  }

  // ── Imperative handle for footer Capture button ───────────────────
  useImperativeHandle(ref, () => ({
    triggerCapture() {
      if (mode === 'scan') {
        if (scanning) stopScan()
        else startScan()
      } else {
        fileRef.current?.click()
      }
    },
  }))

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="mb-3">
      {/* Mode toggle — compact, inside the card */}
      <div className="flex bg-neutral-100 rounded-full p-[3px] gap-[3px] mb-2.5">
        <button
          type="button"
          onClick={() => switchMode('scan')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full text-[11px] font-bold transition-all ${
            mode === 'scan' ? 'bg-white text-primary-600 shadow-sm' : 'text-neutral-400'
          }`}
        >
          <ScanLine size={13} /> Barcode
        </button>
        <button
          type="button"
          onClick={() => switchMode('photo')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full text-[11px] font-bold transition-all ${
            mode === 'photo' ? 'bg-white text-primary-600 shadow-sm' : 'text-neutral-400'
          }`}
        >
          <Sparkles size={13} /> AI Photo
        </button>
      </div>

      {/* ── Scanner view ── */}
      {mode === 'scan' && (
        <div className="relative h-40 rounded-[16px] overflow-hidden bg-[#0B0B0D]">
          {/* Live camera feed */}
          <div id={SCANNER_DIV} className="absolute inset-0" />

          {/* Static overlay when not scanning */}
          {!scanning && !matchedBarcode && (
            <>
              <div className="absolute inset-0 pointer-events-none" style={{
                background: 'radial-gradient(circle at 30% 30%,rgba(255,255,255,.05),transparent 50%), linear-gradient(160deg,#1c1c20,#0b0b0d 70%)'
              }} />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-28">
                {(['tl','tr','bl','br'] as const).map((pos) => (
                  <div key={pos} className={`absolute w-5 h-5 border-[2.5px] border-primary-500 ${
                    pos==='tl'?'top-0 left-0 rounded-tl-[7px] border-r-0 border-b-0':
                    pos==='tr'?'top-0 right-0 rounded-tr-[7px] border-l-0 border-b-0':
                    pos==='bl'?'bottom-0 left-0 rounded-bl-[7px] border-r-0 border-t-0':
                    'bottom-0 right-0 rounded-br-[7px] border-l-0 border-t-0'}`} />
                ))}
                <div className="absolute left-1 right-1 h-0.5 rounded-sm" style={{
                  top:'50%',
                  background:'linear-gradient(90deg,transparent,#E8197D 30%,#F9BBDF,#E8197D 70%,transparent)',
                  boxShadow:'0 0 8px rgba(232,25,125,0.8)',
                  animation:'miniLaser 1.5s ease-in-out infinite',
                }} />
              </div>
            </>
          )}

          {/* Scanning status pill */}
          {scanning && (
            <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-error-400" style={{ animation: 'chatDotBlink 1s ease-in-out infinite' }} />
              <span className="text-[10px] font-bold text-white">Scanning…</span>
            </div>
          )}

          {/* Match badge */}
          {matchedBarcode && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <div className="bg-success-500/90 backdrop-blur-sm rounded-[12px] px-4 py-2.5 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                <div>
                  <p className="text-[11px] font-extrabold text-white">Match found — fields filled</p>
                  <p className="text-[10px] text-white/75 font-medium">{matchedBarcode}</p>
                </div>
              </div>
            </div>
          )}

          {scanError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-[11px] text-white/70 font-semibold px-4 text-center">{scanError}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Photo AI view ── */}
      {mode === 'photo' && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handlePhotoFile(e.target.files[0])}
          />
          {photoPreview ? (
            <div className="relative h-40 rounded-[16px] overflow-hidden">
              <img src={photoPreview} alt="captured" className="w-full h-full object-cover" />
              {analyzing && (
                <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center gap-2">
                  <div className="w-7 h-7 border-2 border-white border-t-transparent rounded-full animate-spin-slow" />
                  <p className="text-white text-xs font-bold">AI analyzing…</p>
                </div>
              )}
              {!analyzing && (
                <button
                  type="button"
                  onClick={() => { setPhotoPreview(null); if (fileRef.current) fileRef.current.value = '' }}
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs"
                >✕</button>
              )}
            </div>
          ) : (
            <div
              onClick={() => fileRef.current?.click()}
              className="h-40 rounded-[16px] border-2 border-dashed border-primary-200 bg-primary-50 flex flex-col items-center justify-center gap-2 cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                <Sparkles size={22} className="text-primary-500" />
              </div>
              <p className="text-xs font-bold text-primary-600">Tap Capture to take photo</p>
              <p className="text-[10px] text-neutral-400 font-medium">AI auto-fills name, material & price</p>
            </div>
          )}
        </>
      )}
    </div>
  )
})
