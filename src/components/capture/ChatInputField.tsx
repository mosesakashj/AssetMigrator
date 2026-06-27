import { useRef, useState } from 'react'
import { Mic, Check } from 'lucide-react'

// Browser SpeechRecognition types (same as VoiceCapture)
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
interface SpeechRecognitionCtor { new(): SpeechRecognitionInstance }

function getSpeechRec(): SpeechRecognitionCtor | null {
  const w = window as Window & { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

type MicState = 'idle' | 'recording' | 'processing'

interface ChatInputFieldProps {
  label: string
  required?: boolean
  autoTag?: boolean
  prefix?: string
  placeholder: string
  value: string
  autofilled?: boolean
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  onChange: (v: string) => void
  /** Called with raw transcript after speech ends — parent handles parsing */
  onVoiceResult?: (transcript: string) => void
}

export function ChatInputField({
  label, required, autoTag, prefix, placeholder,
  value, autofilled, inputMode, onChange, onVoiceResult,
}: ChatInputFieldProps) {
  const [micState, setMicState] = useState<MicState>('idle')
  const [interim, setInterim] = useState('')
  const recRef = useRef<SpeechRecognitionInstance | null>(null)
  const transcriptRef = useRef('')

  const hasText = value.trim().length > 0
  const isRecording = micState === 'recording'
  const isProcessing = micState === 'processing'

  function startRecording() {
    const SpeechRec = getSpeechRec()
    if (!SpeechRec) { alert('Speech not supported — try Chrome on Android'); return }
    transcriptRef.current = ''
    setInterim('')
    const rec = new SpeechRec()
    recRef.current = rec
    rec.continuous = false
    rec.interimResults = true
    rec.lang = 'en-IN'
    rec.onstart = () => setMicState('recording')
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const text = Array.from(e.results).map((r) => (r as SpeechRecognitionResult)[0].transcript).join('')
      transcriptRef.current = text
      setInterim(text)
    }
    rec.onend = async () => {
      const text = transcriptRef.current
      if (!text) { setMicState('idle'); setInterim(''); return }
      setMicState('processing')
      if (onVoiceResult) {
        await onVoiceResult(text)
      } else {
        onChange(text)
      }
      setInterim('')
      setMicState('idle')
    }
    rec.start()
  }

  function stopRecording() {
    recRef.current?.stop()
  }

  function handleMicClick() {
    if (isProcessing) return
    if (isRecording) { stopRecording(); return }
    if (hasText) {
      // acts as confirm button when field has value
      return
    }
    startRecording()
  }

  const borderClass = autofilled
    ? 'border-green-300'
    : isRecording
    ? 'border-error-500'
    : 'border-neutral-200 focus-within:border-primary-600'

  const bgClass = autofilled ? 'bg-success-50' : 'bg-white'

  return (
    <div className="mb-3.5">
      {/* Label */}
      <div className="flex items-center gap-1 text-xs font-bold text-neutral-500 mb-1.5">
        {label}
        {required && <span className="text-error-500">*</span>}
        {autoTag && (
          <span className="text-[9.5px] font-extrabold text-success-600 bg-success-50 border border-green-200 rounded-full px-1.5 py-px tracking-wide ml-1">
            AUTO
          </span>
        )}
      </div>

      {/* WhatsApp-style pill input row */}
      <div className={`flex items-center gap-0 ${bgClass} border-[1.5px] ${borderClass} rounded-full pl-4 pr-1.5 py-1.5 transition-all`}
        style={{ boxShadow: isRecording ? '0 0 0 3px rgba(239,68,68,0.1)' : undefined }}
      >
        {prefix && (
          <span className="text-sm font-bold text-neutral-400 mr-1 flex-shrink-0">{prefix}</span>
        )}
        <input
          value={interim || value}
          onChange={(e) => { onChange(e.target.value); setInterim('') }}
          placeholder={placeholder}
          inputMode={inputMode}
          className={`flex-1 text-sm font-medium bg-transparent outline-none min-w-0 py-1.5 ${autofilled ? 'text-neutral-900' : 'text-neutral-900'} placeholder:text-neutral-400`}
        />

        {/* Mic / Confirm button */}
        <button
          type="button"
          onClick={handleMicClick}
          disabled={isProcessing}
          className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center transition-all ml-1 ${
            isProcessing
              ? 'bg-neutral-200'
              : isRecording
              ? 'bg-error-500'
              : hasText
              ? 'bg-success-600'
              : ''
          }`}
          style={
            !isRecording && !hasText && !isProcessing
              ? { background: 'linear-gradient(135deg,#9E1568,#E8197D)', boxShadow: '0 2px 8px rgba(194,26,127,0.3)' }
              : isRecording
              ? { animation: 'chatMicPulse 1s ease-in-out infinite' }
              : undefined
          }
        >
          {isProcessing ? (
            <div className="w-4 h-4 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin-slow" />
          ) : hasText ? (
            <Check size={16} color="white" strokeWidth={2.8} />
          ) : (
            <Mic size={17} color="white" strokeWidth={2} />
          )}
        </button>
      </div>

      {/* Recording indicator */}
      {isRecording && (
        <div className="flex items-center gap-1.5 mt-1.5 pl-4">
          <span className="w-1.5 h-1.5 rounded-full bg-error-500" style={{ animation: 'chatDotBlink 1s ease-in-out infinite' }} />
          <span className="text-[11px] font-bold text-error-500">
            {interim ? `"${interim}"` : 'Listening…'}
          </span>
        </div>
      )}
    </div>
  )
}
