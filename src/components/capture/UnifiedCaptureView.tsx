import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { MOCK_BARCODE_DB } from '../../types/asset'
import { analyzeAssetPhoto } from '../../services/aiService'
import type { AssetFields, AIRecognitionResult } from '../../types/asset'

export interface UnifiedCaptureHandle {
  triggerCapture: () => void
}

interface Props {
  onBarcodeMatch: (fields: Partial<AssetFields>, barcode: string) => void
  onBarcodeNoMatch: (code: string) => void
  onPhotoResult: (result: AIRecognitionResult, imageBase64: string) => void
  onPhotoError: (msg: string) => void
}

export const UnifiedCaptureView = forwardRef<UnifiedCaptureHandle, Props>(function UnifiedCaptureView(
  { onBarcodeMatch, onBarcodeNoMatch, onPhotoResult, onPhotoError },
  ref
) {
  const [scanning, setScanning] = useState(false)
  const [matchedBarcode, setMatchedBarcode] = useState<string | null>(null)
  const [scanError, setScanError] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const SCANNER_DIV = 'unified-scanner-div'

  useEffect(() => {
    startScan()
    return () => { try { scannerRef.current?.stop().catch(() => {}) } catch {} }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
        setPhotoPreview(null)
      }
    }
    reader.readAsDataURL(file)
  }

  useImperativeHandle(ref, () => ({
    triggerCapture() {
      fileRef.current?.click()
    },
  }))

  return (
    <div className="mb-3">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) handlePhotoFile(e.target.files[0])
          if (fileRef.current) fileRef.current.value = ''
        }}
      />

      <div className="relative h-64 rounded-[16px] overflow-hidden bg-[#0B0B0D]">
        <div id={SCANNER_DIV} className="absolute inset-0" />

        {/* Static overlay when not scanning */}
        {!scanning && !matchedBarcode && !analyzing && (
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

        {/* Scanning status */}
        {scanning && (
          <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-error-400" style={{ animation: 'chatDotBlink 1s ease-in-out infinite' }} />
            <span className="text-[10px] font-bold text-white">Scanning…</span>
          </div>
        )}

        {/* Analyzing overlay */}
        {analyzing && photoPreview && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2">
            <img src={photoPreview} alt="captured" className="absolute inset-0 w-full h-full object-cover opacity-40" />
            <div className="relative z-10 flex flex-col items-center gap-2">
              <div className="w-7 h-7 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <p className="text-white text-xs font-bold">AI analyzing…</p>
            </div>
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
    </div>
  )
})
