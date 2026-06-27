import { useRef, useState } from 'react'
import { Mic } from 'lucide-react'
import { parseVoiceTranscript } from '../../services/aiService'
import type { PriceUnit } from '../../types/asset'

interface VoiceCaptureProps {
  onResult: (fields: { name?: string; price?: string; priceUnit?: PriceUnit }) => void
}

type VoiceState = 'idle' | 'listening' | 'processing'

// Browser SpeechRecognition types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onstart: (() => void) | null
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  onend: (() => void) | null
}
interface SpeechRecognitionCtor {
  new(): SpeechRecognitionInstance
}

function getSpeechRec(): SpeechRecognitionCtor | null {
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function VoiceCapture({ onResult }: VoiceCaptureProps) {
  const [state, setState] = useState<VoiceState>('idle')
  const [transcript, setTranscript] = useState('')
  const recRef = useRef<SpeechRecognitionInstance | null>(null)
  const transcriptRef = useRef('')

  function startListening() {
    const SpeechRec = getSpeechRec()
    if (!SpeechRec) {
      alert('Speech recognition is not supported in this browser. Try Chrome on Android.')
      return
    }
    transcriptRef.current = ''
    setTranscript('')
    const rec = new SpeechRec()
    recRef.current = rec
    rec.continuous = false
    rec.interimResults = true
    rec.lang = 'en-IN'

    rec.onstart = () => setState('listening')
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const text = Array.from(e.results)
        .map((r) => (r as SpeechRecognitionResult)[0].transcript)
        .join('')
      transcriptRef.current = text
      setTranscript(text)
    }
    rec.onend = async () => {
      const text = transcriptRef.current
      if (!text) { setState('idle'); return }
      setState('processing')
      try {
        const fields = await parseVoiceTranscript(text)
        onResult(fields as { name?: string; price?: string; priceUnit?: PriceUnit })
      } catch {
        // deliver best-effort
      }
      setState('idle')
    }
    rec.start()
  }

  function stopListening() {
    recRef.current?.stop()
  }

  const isListening = state === 'listening'
  const isProcessing = state === 'processing'

  return (
    <div className="flex flex-col items-center pb-4 pt-2">
      <div className="relative w-24 h-24 flex items-center justify-center">
        {isListening && (
          <>
            <div className="absolute w-full h-full rounded-full border-2 border-primary-200 opacity-0" style={{ animation: 'micPulse 1.6s ease-out infinite' }} />
            <div className="absolute w-[78%] h-[78%] rounded-full border-2 border-primary-200 opacity-0" style={{ animation: 'micPulse 1.6s ease-out 0.4s infinite' }} />
          </>
        )}
        <button
          type="button"
          onClick={isListening ? stopListening : startListening}
          disabled={isProcessing}
          className="relative z-10 w-14 h-14 rounded-full flex items-center justify-center text-white transition-transform active:scale-95 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg,#9E1568,#E8197D)', boxShadow: '0 6px 20px rgba(194,26,127,0.38)' }}
        >
          {isProcessing
            ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin-slow" />
            : <Mic size={22} />
          }
        </button>
      </div>

      <p className="text-xs font-bold text-neutral-500 mt-2">
        {isProcessing ? 'Parsing with AI…' : isListening ? 'Listening…' : 'Tap the mic and say name & price'}
      </p>

      {isListening && (
        <div className="flex items-end gap-0.5 h-5 mt-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="w-0.5 rounded-sm bg-primary-500"
              style={{ height: 5, animation: `wfBounce 0.9s ease-in-out ${i * 0.1}s infinite` }}
            />
          ))}
        </div>
      )}

      <div className="w-full mt-3.5 bg-white border-[1.5px] border-neutral-200 rounded-md p-3 min-h-10">
        <div className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wide mb-1">Heard</div>
        <p className={`text-[12.5px] font-semibold leading-snug ${transcript ? 'text-neutral-900' : 'text-neutral-400'}`}>
          {transcript || '"4-person dome tent, price 350 per day"'}
        </p>
      </div>
    </div>
  )
}
