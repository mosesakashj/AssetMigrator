import { useRef, useState } from 'react'
import { Camera, Sparkles } from 'lucide-react'
import { analyzeAssetPhoto } from '../../services/aiService'
import type { AIRecognitionResult } from '../../types/asset'

interface PhotoCaptureProps {
  onResult: (fields: AIRecognitionResult, imageBase64: string) => void
}

export function PhotoCapture({ onResult }: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(file: File) {
    setError('')
    const reader = new FileReader()
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string
      const base64 = dataUrl.split(',')[1]
      setPreview(dataUrl)
      setAnalyzing(true)
      try {
        const result = await analyzeAssetPhoto(base64, file.type as 'image/jpeg' | 'image/png' | 'image/webp')
        onResult(result, base64)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'AI analysis failed'
        setError(msg.includes('API_KEY') ? 'Add VITE_ANTHROPIC_API_KEY to .env to enable AI recognition.' : msg)
      } finally {
        setAnalyzing(false)
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      {preview ? (
        <div className="relative rounded-lg overflow-hidden mb-3">
          <img src={preview} alt="captured" className="w-full h-44 object-cover" />
          {analyzing && (
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin-slow" />
              <p className="text-white text-xs font-bold">Analyzing with AI…</p>
            </div>
          )}
          {!analyzing && (
            <button
              type="button"
              onClick={() => { setPreview(null); setError('') }}
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>
      ) : (
        <div
          className="h-44 rounded-lg border-2 border-dashed border-primary-200 bg-primary-50 flex flex-col items-center justify-center gap-2 mb-3 cursor-pointer"
          onClick={() => inputRef.current?.click()}
        >
          <Camera size={28} className="text-primary-500" />
          <p className="text-xs font-bold text-primary-600">Tap to capture or upload photo</p>
          <p className="text-[10px] text-neutral-400 font-medium">AI will auto-fill asset details</p>
        </div>
      )}

      {error && <p className="text-[11px] text-amber-600 font-semibold mb-2 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">{error}</p>}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={analyzing}
        className="w-full py-3 rounded-md text-sm font-extrabold text-white flex items-center justify-center gap-2 disabled:opacity-50"
        style={{ background: 'linear-gradient(100deg,#9E1568,#C21A7F,#E8197D)', boxShadow: '0 4px 14px rgba(194,26,127,0.28)' }}
      >
        <Sparkles size={15} />
        {analyzing ? 'AI Analyzing…' : preview ? 'Retake Photo' : 'Capture & Auto-Fill with AI'}
      </button>
    </div>
  )
}
