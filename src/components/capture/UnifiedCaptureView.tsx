import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Sparkles, ScanLine, Camera } from 'lucide-react'
import { MOCK_BARCODE_DB } from '../../types/asset'
import { analyzeAssetPhoto } from '../../services/aiService'
import type { AssetFields, AIRecognitionResult } from '../../types/asset'

type CaptureMode = 'scan' | 'photo'

interface UnifiedCaptureViewProps {
  onBarcodeMatch: (fields: Partial<AssetFields>, barcode: string) => void
  onBarcodeNoMatch: (code: string) => void
  onPhotoResult: (result: AIRecognitionResult, imageBase64: string) => void
  onPhotoError: (msg: string) => void
}

export function UnifiedCaptureView({
  onBarcodeMatch, onBarcodeNoMatch, onPhotoResult, onPhotoError,
}: UnifiedCaptureViewProps) {
  const [mode, setMode] = useState<CaptureMode>('scan')
  const [scanning, setScanning] = useState(false)
  const [lastBarcode, setLastBarcode] = useState<string | null>(null)
  const [scanError, setScanError] = useState('')
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const SCANNER_DIV = 'unified-scanner-div'

  useEffect(() => {
    return () => { scannerRef.current?.stop().catch(() => {}) }
  }, [])

  // Switch mode: stop any active scanner
  function switchMode(m: CaptureMode) {
    if (m === mode) return
    if (scanning) { scannerRef.current?.stop().catch(() => {}); setScanning(false) }
    setLastBarcode(null)
    setScanError('')
    setPhotoPreview(null)
    setMode(m)
  }

  // ── BARCODE ─────────────────────────────
  async function startScan() {
    setScanError('')
    setLastBarcode(null)
    try {
      const scanner = new Html5Qrcode(SCANNER_DIV)
      scannerRef.current = scanner
      setScanning(true)
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 200, height: 130 } },
        (code) => {
          scanner.stop().catch(() => {})
          setScanning(false)
          setLastBarcode(code)
          const match = MOCK_BARCODE_DB[code]
          if (match) onBarcodeMatch(match, code)
          else onBarcodeNoMatch(code)
        },
        () => {}
      )
    } catch {
      setScanning(false)
      setScanError('Camera access denied. Check browser permissions.')
    }
  }

  function stopScan() {
    scannerRef.current?.stop().catch(() => {})
    setScanning(false)
  }

  // ── PHOTO AI ─────────────────────────────
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

  // ── RENDER ────────────────────────────────
  return (
    <div className="mb-4">
      {/* Mode toggle pill */}
      <div className="flex bg-neutral-100 rounded-full p-1 gap-1 mb-3">
        <button
          type="button"
          onClick={() => switchMode('scan')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-bold transition-all ${
            mode === 'scan' ? 'bg-white text-primary-600 shadow-sm' : 'text-neutral-400'
          }`}
        >
          <ScanLine size={14} /> Barcode Scan
        </button>
        <button
          type="button"
          onClick={() => switchMode('photo')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-bold transition-all ${
            mode === 'photo' ? 'bg-white text-primary-600 shadow-sm' : 'text-neutral-400'
          }`}
        >
          <Sparkles size={14} /> AI Photo
        </button>
      </div>

      {/* ── SCAN MODE ── */}
      {mode === 'scan' && (
        <>
          {/* Scanner view */}
          <div className="relative h-44 rounded-[16px] overflow-hidden bg-[#0B0B0D] mb-3">
            {/* Live camera div (shown only while scanning) */}
            <div id={SCANNER_DIV} className={`absolute inset-0 ${scanning ? '' : 'hidden'}`} />

            {/* Static preview when not scanning */}
            {!scanning && (
              <>
                <div className="absolute inset-0" style={{
                  background: 'radial-gradient(circle at 30% 30%,rgba(255,255,255,.05),transparent 50%), linear-gradient(160deg,#1c1c20,#0b0b0d 70%)'
                }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36">
                  {(['tl','tr','bl','br'] as const).map((pos) => (
                    <div key={pos} className={`absolute w-5 h-5 border-[2.5px] border-primary-500 ${
                      pos==='tl' ? 'top-0 left-0 rounded-tl-[7px] border-r-0 border-b-0'
                      : pos==='tr' ? 'top-0 right-0 rounded-tr-[7px] border-l-0 border-b-0'
                      : pos==='bl' ? 'bottom-0 left-0 rounded-bl-[7px] border-r-0 border-t-0'
                      : 'bottom-0 right-0 rounded-br-[7px] border-l-0 border-t-0'
                    }`} />
                  ))}
                  <div className="absolute left-1 right-1 h-0.5 rounded-sm" style={{
                    top: '50%',
                    background: 'linear-gradient(90deg,transparent,#E8197D 30%,#F9BBDF,#E8197D 70%,transparent)',
                    boxShadow: '0 0 8px rgba(232,25,125,0.8)',
                    animation: 'miniLaser 1.5s ease-in-out infinite',
                  }} />
                </div>
                <p className="absolute bottom-2.5 left-0 right-0 text-center text-white text-[10.5px] font-semibold opacity-70">
                  Tap below to activate camera
                </p>
              </>
            )}

            {/* Matched badge overlay */}
            {lastBarcode && !scanning && (
              <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-sm rounded-[10px] px-2.5 py-1.5 flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-success-500 flex items-center justify-center flex-shrink-0">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                </div>
                <div>
                  <p className="text-[11px] font-extrabold text-success-400">Match found — fields filled</p>
                  <p className="text-[10px] text-white/60 font-medium">{lastBarcode}</p>
                </div>
              </div>
            )}
          </div>

          {scanError && <p className="text-[11px] text-error-500 font-semibold mb-2 px-1">{scanError}</p>}

          <button
            type="button"
            onClick={scanning ? stopScan : startScan}
            className="w-full py-3 rounded-full text-sm font-extrabold text-white flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(100deg,#9E1568,#C21A7F,#E8197D)', boxShadow: '0 4px 14px rgba(194,26,127,0.25)' }}
          >
            <ScanLine size={16} />
            {scanning ? 'Stop Scanning' : 'Tap to Scan Barcode / QR'}
          </button>
        </>
      )}

      {/* ── PHOTO AI MODE ── */}
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
            <div className="relative h-44 rounded-[16px] overflow-hidden mb-3">
              <img src={photoPreview} alt="captured" className="w-full h-full object-cover" />
              {analyzing && (
                <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center gap-2">
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin-slow" />
                  <p className="text-white text-xs font-bold">AI analyzing photo…</p>
                </div>
              )}
              {!analyzing && (
                <button
                  type="button"
                  onClick={() => { setPhotoPreview(null); if (fileRef.current) fileRef.current.value = '' }}
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold"
                >✕</button>
              )}
            </div>
          ) : (
            <div
              onClick={() => fileRef.current?.click()}
              className="h-44 rounded-[16px] border-2 border-dashed border-primary-200 bg-primary-50 flex flex-col items-center justify-center gap-2 mb-3 cursor-pointer"
            >
              <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-sm">
                <Camera size={26} className="text-primary-500" />
              </div>
              <p className="text-sm font-bold text-primary-600">Tap to capture photo</p>
              <p className="text-[11px] text-neutral-400 font-medium">AI fills name, material, description & price</p>
            </div>
          )}

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={analyzing}
            className="w-full py-3 rounded-full text-sm font-extrabold text-white flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: 'linear-gradient(100deg,#9E1568,#C21A7F,#E8197D)', boxShadow: '0 4px 14px rgba(194,26,127,0.25)' }}
          >
            <Sparkles size={15} />
            {analyzing ? 'AI Analyzing…' : photoPreview ? 'Retake & Re-analyze' : 'Capture & Auto-Fill with AI'}
          </button>
        </>
      )}
    </div>
  )
}
