import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Camera, CheckCircle, Loader, Mic } from 'lucide-react'
import { TopBar } from '../../components/layout/TopBar'
import { UnifiedCaptureView, type UnifiedCaptureHandle } from '../../components/capture/UnifiedCaptureView'
import { VariantBuilder } from '../../components/shared/VariantBuilder'
import { Toast, useToast } from '../../components/shared/Toast'
import { useSessionStore } from '../../stores/sessionStore'
import { useAssetsStore } from '../../stores/assetsStore'
import { mockApiPush } from '../../services/apiService'
import type { AssetFields, PriceUnit } from '../../types/asset'

function makeEmptyFields(priceUnit: PriceUnit = 'Per Day'): AssetFields {
  return {
    name: '', description: '', category: '', brand: '', model: '',
    material: '', condition: '', price: '', qty: '1', priceUnit,
    imageBase64: null, variantAttributes: [], variantCombos: [],
  }
}

const PRICE_UNITS: PriceUnit[] = ['Per Day', 'Per Hour', 'Flat']
const UNIT_LABEL: Record<PriceUnit, string> = { 'Per Day': '/Day', 'Per Hour': '/Hr', 'Flat': 'Flat' }

interface SpeechRecognitionEvent extends Event { results: SpeechRecognitionResultList }
interface SpeechRec extends EventTarget {
  continuous: boolean; interimResults: boolean; lang: string
  start(): void; stop(): void
  onstart: (() => void) | null
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  onend: (() => void) | null
}
function getSpeechRec() {
  const w = window as Window & { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

function parseTranscript(transcript: string) {
  const priceMatch = transcript.match(/(\d+)\s*(?:rupees?|rs\.?|₹)?\s*(?:per\s+)?(day|hour|flat)/i)
  const qtyMatch = transcript.match(/(?:qty|quantity|count|pieces?|units?)\s*[:\-]?\s*(\d+)/i)
  const nameGuess = transcript.replace(/\d+.*$/i, '').trim()
  return {
    name: nameGuess || undefined,
    price: priceMatch?.[1],
    priceUnit: priceMatch?.[2]
      ? (priceMatch[2].toLowerCase() === 'hour' ? 'Per Hour' : 'Per Day')
      : undefined,
    qty: qtyMatch?.[1],
  }
}

type VoiceState = 'idle' | 'listening'

export function Step2CapturePage() {
  const navigate = useNavigate()
  const { classify, sessionId } = useSessionStore()
  const { sessionAssets, addSessionAsset, commitSession, setAssetsPushStatus } = useAssetsStore()
  const { msg, show, clear } = useToast()

  const captureRef = useRef<UnifiedCaptureHandle>(null)
  const recRef = useRef<SpeechRec | null>(null)
  const transcriptRef = useRef('')
  const isVoiceSessionRef = useRef(false)

  const [fields, setFields] = useState<AssetFields>(() => makeEmptyFields(classify.priceUnit))
  const [showSuccess, setShowSuccess] = useState(false)
  const [syncState, setSyncState] = useState<'syncing' | 'done' | 'failed'>('syncing')
  const [failedCount, setFailedCount] = useState(0)

  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const [voiceLive, setVoiceLive] = useState('')

  const sessionCount = sessionAssets.length

  function setField<K extends keyof AssetFields>(key: K, val: AssetFields[K]) {
    setFields((f) => ({ ...f, [key]: val }))
  }

  // ── Voice ──────────────────────────────────────────────────────────
  function startOneUtterance() {
    const SpeechRec = getSpeechRec()
    if (!SpeechRec || !isVoiceSessionRef.current) return

    transcriptRef.current = ''
    const rec = new SpeechRec()
    recRef.current = rec
    rec.continuous = false
    rec.interimResults = true
    rec.lang = 'en-IN'

    rec.onstart = () => { setVoiceState('listening'); setVoiceLive('') }

    rec.onresult = (e: SpeechRecognitionEvent) => {
      const text = Array.from(e.results).map((r) => (r as SpeechRecognitionResult)[0].transcript).join('')
      transcriptRef.current = text
      setVoiceLive(text)
    }

    rec.onend = () => {
      if (!isVoiceSessionRef.current) return
      const text = transcriptRef.current
      if (!text) {
        setTimeout(() => startOneUtterance(), 200)
        return
      }

      const parsed = parseTranscript(text)
      const partial: Partial<AssetFields> = {}
      if (parsed.name)      partial.name      = parsed.name
      if (parsed.price)     partial.price     = parsed.price
      if (parsed.priceUnit) partial.priceUnit = parsed.priceUnit as PriceUnit
      if (parsed.qty)       partial.qty       = parsed.qty

      if (parsed.name || parsed.price) {
        setFields((f) => ({ ...f, ...partial }))
        isVoiceSessionRef.current = false
        setVoiceState('idle')
        setVoiceLive('')
      } else {
        setTimeout(() => { if (isVoiceSessionRef.current) startOneUtterance() }, 400)
      }
    }

    rec.start()
  }

  function startVoiceSession() {
    const SpeechRec = getSpeechRec()
    if (!SpeechRec) { show('Speech not supported — try Chrome'); return }
    isVoiceSessionRef.current = true
    startOneUtterance()
  }

  function stopVoiceSession() {
    isVoiceSessionRef.current = false
    try { recRef.current?.stop() } catch {}
    setVoiceState('idle')
    setVoiceLive('')
  }

  // ── Capture handlers ───────────────────────────────────────────────
  function handlePhotoCaptured(imageBase64: string) {
    setFields((f) => ({ ...f, imageBase64 }))
  }

  function handleBarcodeMatch(barcodeFields: Partial<AssetFields>, barcode: string) {
    setFields((f) => ({ ...f, ...barcodeFields }))
    show(`✓ Barcode matched — ${barcode}`)
  }

  // ── Save ───────────────────────────────────────────────────────────
  function saveAndNext() {
    if (!fields.name.trim() || !fields.price.trim()) { show('Name and price are required'); return }
    addSessionAsset({
      ...fields,
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      branch: classify.branch,
      sessionId,
      createdAt: Date.now(),
      category: fields.category || classify.category,
      brand: fields.brand || classify.brand,
      model: fields.model || classify.model,
    })
    show(`✓ "${fields.name}" added`)
    setFields(makeEmptyFields(classify.priceUnit))
    captureRef.current?.resetPhoto()
  }

  function finishSession() {
    const assetsToSync = [...sessionAssets]
    commitSession()
    setSyncState('syncing')
    setFailedCount(0)
    setShowSuccess(true)

    const ids = assetsToSync.map((a) => a.id)
    mockApiPush(assetsToSync)
      .then((result) => {
        const failedIds = result.failedIds ?? []
        const succeededIds = ids.filter((id) => !failedIds.includes(id))
        if (succeededIds.length > 0) setAssetsPushStatus(succeededIds, 'queued')
        if (failedIds.length > 0) {
          setAssetsPushStatus(failedIds, 'failed')
          setFailedCount(failedIds.length)
          setSyncState('failed')
        } else {
          setSyncState('done')
        }
      })
      .catch(() => {
        setAssetsPushStatus(ids, 'failed')
        setFailedCount(ids.length)
        setSyncState('failed')
      })
  }

  function handleBack() { if (sessionCount > 0) finishSession(); else navigate('/add/step1') }

  const isVoiceActive = voiceState !== 'idle'

  // ── Success screen ─────────────────────────────────────────────────
  if (showSuccess) {
    return (
      <div className="flex flex-col h-[100dvh] bg-neutral-100 max-w-md mx-auto animate-fade-in">
        <TopBar title="Session Complete" />
        <div className="flex-1 flex flex-col items-center justify-center gap-5 px-8 text-center">
          {syncState === 'syncing' && (
            <div className="w-24 h-24 rounded-full bg-neutral-100 border-2 border-neutral-200 flex items-center justify-center shadow-md">
              <Loader size={40} className="text-neutral-400 animate-spin-slow" />
            </div>
          )}
          {syncState === 'done' && (
            <div className="w-24 h-24 rounded-full bg-success-50 border-2 border-green-200 flex items-center justify-center shadow-md">
              <CheckCircle size={44} className="text-success-600" strokeWidth={1.8} />
            </div>
          )}
          {syncState === 'failed' && (
            <div className="w-24 h-24 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center shadow-md">
              <AlertTriangle size={44} className="text-amber-500" strokeWidth={1.8} />
            </div>
          )}
          <div>
            <h2 className="text-2xl font-extrabold text-neutral-900">
              {sessionCount} asset{sessionCount !== 1 ? 's' : ''} captured
            </h2>
            <p className="text-sm font-semibold text-neutral-400 mt-2 leading-relaxed">
              {classify.categoryIcon} {classify.category} · {classify.branch}
            </p>
            <p className={`text-xs font-semibold mt-2 ${
              syncState === 'syncing' ? 'text-neutral-400'
              : syncState === 'done' ? 'text-success-600'
              : 'text-amber-600'
            }`}>
              {syncState === 'syncing' && 'Syncing to RentAsst…'}
              {syncState === 'done' && 'All synced!'}
              {syncState === 'failed' && `${failedCount} asset${failedCount !== 1 ? 's' : ''} failed — see your list to retry`}
            </p>
          </div>
        </div>
        <div className="px-4 pt-3.5 pb-5 bg-white border-t border-neutral-200 flex gap-2.5">
          <button onClick={() => navigate('/')}
            className="flex-1 py-3.5 rounded-xl border-[1.5px] border-neutral-200 text-sm font-bold text-neutral-500">
            Back to Assets
          </button>
          <button onClick={() => navigate('/export')}
            className="flex-[2] py-3.5 rounded-xl text-sm font-extrabold text-white"
            style={{ background: 'linear-gradient(100deg,#9E1568,#C21A7F,#E8197D)', boxShadow: '0 4px 14px rgba(194,26,127,0.3)' }}>
            Export / Push to RentAsst
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-neutral-100 max-w-md mx-auto animate-slide-up">
      <TopBar title="Add Asset Session" onBack={handleBack} />

      {/* Session bar */}
      <div className="bg-white border-b border-neutral-200 flex-shrink-0">
        <div className="flex gap-1.5 px-4 pt-2 pb-0">
          <div className="flex-1 h-1 rounded-full bg-primary-600" />
          <div className="flex-1 h-1 rounded-full bg-primary-600" />
        </div>
        <div className="px-4 pt-2 pb-2.5 flex items-center justify-between">
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[11px] font-bold text-primary-700 bg-primary-50 border border-primary-200 rounded-full px-2.5 py-1">
              {classify.categoryIcon} {classify.category}
            </span>
            <span className="text-[11px] font-bold text-primary-700 bg-primary-50 border border-primary-200 rounded-full px-2.5 py-1">
              {classify.branch}
            </span>
            {classify.brand && (
              <span className="text-[11px] font-bold text-neutral-500 bg-neutral-100 border border-neutral-200 rounded-full px-2.5 py-1">
                {classify.brand}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-extrabold text-success-600 bg-success-50 border border-green-200 rounded-full px-2.5 py-1 flex-shrink-0 ml-2">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><path d="M20 6L9 17l-5-5"/></svg>
            {sessionCount}
          </div>
        </div>
      </div>

      {/* Scrollable form */}
      <div className="flex-1 overflow-y-auto scrollbar-none px-4 pt-3 pb-2">

        <UnifiedCaptureView
          ref={captureRef}
          onBarcodeMatch={handleBarcodeMatch}
          onBarcodeNoMatch={(code) => show(`No match for ${code}`)}
          onPhotoCaptured={handlePhotoCaptured}
        />

        {/* Voice */}
        <button
          type="button"
          onClick={isVoiceActive ? stopVoiceSession : startVoiceSession}
          className={`w-full mb-3 flex items-center gap-3 rounded-2xl border-[1.5px] px-4 py-3 active:scale-[0.98] transition-all ${
            isVoiceActive ? 'border-error-300 bg-red-50' : 'border-neutral-200 bg-white'
          }`}
        >
          <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${
            isVoiceActive ? 'bg-error-500' : ''
          }`}
            style={
              !isVoiceActive
                ? { background: 'linear-gradient(135deg,#9E1568,#E8197D)', boxShadow: '0 3px 10px rgba(194,26,127,0.28)' }
                : { animation: 'chatMicPulse 1s ease-in-out infinite' }
            }
          >
            <Mic size={18} color="white" strokeWidth={2} />
          </div>

          <div className="flex-1 min-w-0 text-left">
            {isVoiceActive ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-error-500 flex-shrink-0"
                    style={{ animation: 'chatDotBlink 1s ease-in-out infinite' }} />
                  <p className="text-[11px] font-extrabold text-error-600 uppercase tracking-wide">Listening…</p>
                </div>
                <p className="text-[12px] font-medium text-neutral-700 truncate mt-px">
                  {voiceLive || <span className="text-neutral-400">Say: name · price · qty…</span>}
                </p>
              </>
            ) : (
              <>
                <p className="text-[12.5px] font-bold text-neutral-800">Tap to use voice</p>
                <p className="text-[11px] font-medium text-neutral-400 mt-px">
                  Say <span className="text-neutral-600 font-semibold">name · price · qty</span> — fills fields below
                </p>
              </>
            )}
          </div>

          {isVoiceActive && (
            <div className="flex items-end gap-0.5 h-5 flex-shrink-0">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="w-0.5 rounded-sm bg-error-400"
                  style={{ height: 6, animation: `wfBounce 0.9s ease-in-out ${i * 0.12}s infinite` }} />
              ))}
            </div>
          )}
        </button>

        {/* Name */}
        <div className="mb-3">
          <div className="flex items-center gap-1 text-xs font-bold text-neutral-500 mb-1.5">
            Asset Name <span className="text-error-500">*</span>
          </div>
          <input
            value={fields.name}
            onChange={(e) => setField('name', e.target.value)}
            placeholder="e.g. Folding Table"
            className="w-full px-4 py-[13px] rounded-full text-sm font-medium outline-none transition-colors border-[1.5px] bg-white border-neutral-200 focus:border-primary-600 text-neutral-900"
          />
        </div>

        {/* Price + Unit + Qty */}
        <div className="flex gap-2 mb-4">
          <div className="flex-[3]">
            <div className="flex items-center gap-1 text-xs font-bold text-neutral-500 mb-1.5">
              Price <span className="text-error-500">*</span>
            </div>
            <div className="flex items-center border-[1.5px] rounded-full overflow-hidden transition-colors bg-white border-neutral-200 focus-within:border-primary-600">
              <span className="pl-4 text-sm font-bold text-neutral-400 flex-shrink-0">₹</span>
              <input
                type="number"
                inputMode="decimal"
                value={fields.price}
                onChange={(e) => setField('price', e.target.value)}
                placeholder="0"
                className="flex-1 py-[13px] px-2 text-sm font-medium bg-transparent outline-none min-w-0 text-neutral-900"
              />
              <select
                value={fields.priceUnit}
                onChange={(e) => setField('priceUnit', e.target.value as PriceUnit)}
                className="text-[11px] font-bold text-primary-600 bg-primary-50 border-l border-neutral-200 py-[13px] px-3 outline-none appearance-none cursor-pointer flex-shrink-0"
              >
                {PRICE_UNITS.map((u) => (
                  <option key={u} value={u}>{UNIT_LABEL[u]}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex-[1.6]">
            <div className="text-xs font-bold text-neutral-500 mb-1.5">Qty</div>
            <input
              type="number"
              inputMode="numeric"
              value={fields.qty}
              onChange={(e) => setField('qty', e.target.value)}
              placeholder="1"
              className="w-full px-3 py-[13px] bg-white border-[1.5px] border-neutral-200 rounded-full text-sm font-medium text-neutral-900 text-center outline-none focus:border-primary-600 transition-colors"
            />
          </div>
        </div>

        <VariantBuilder
          attributes={fields.variantAttributes}
          combos={fields.variantCombos}
          onAttributesChange={(a) => setField('variantAttributes', a)}
          onCombosChange={(c) => setField('variantCombos', c)}
        />
      </div>

      {/* Footer */}
      <div className="px-4 pt-3 pb-5 bg-white border-t border-neutral-200 flex gap-2 flex-shrink-0">
        <button onClick={finishSession}
          className="flex-1 py-3.5 rounded-xl border-[1.5px] border-neutral-200 text-xs font-bold text-neutral-500 leading-tight">
          Finish<br />
          <span className="text-[10px] font-medium">({sessionCount})</span>
        </button>

        <button type="button" onClick={() => captureRef.current?.triggerCapture()}
          className="flex-1 py-3.5 rounded-xl border-[1.5px] border-primary-200 bg-primary-50 text-primary-600 flex flex-col items-center justify-center gap-0.5">
          <Camera size={16} />
          <span className="text-[10px] font-bold mt-0.5">Upload</span>
        </button>

        <button onClick={saveAndNext}
          className="flex-[2] py-3.5 rounded-xl text-sm font-extrabold text-white leading-tight"
          style={{ background: 'linear-gradient(100deg,#9E1568,#C21A7F,#E8197D)', boxShadow: '0 4px 14px rgba(194,26,127,0.3)' }}>
          Save &amp; Add<br />
          <span className="text-[10px] font-semibold opacity-80">Next →</span>
        </button>
      </div>

      <Toast message={msg} onDone={clear} />
    </div>
  )
}
