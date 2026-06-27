import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Camera, CheckCircle, Loader, Mic } from 'lucide-react'
import { TopBar } from '../../components/layout/TopBar'
import { UnifiedCaptureView, type UnifiedCaptureHandle } from '../../components/capture/UnifiedCaptureView'
import { VariantBuilder } from '../../components/shared/VariantBuilder'
import { Toast, useToast } from '../../components/shared/Toast'
import { useSessionStore } from '../../stores/sessionStore'
import { useAssetsStore } from '../../stores/assetsStore'
import { parseVoiceTranscript } from '../../services/aiService'
import { mockApiPush } from '../../services/apiService'
import type { AssetFields, PriceUnit, AIRecognitionResult } from '../../types/asset'

interface AutoFilled { name?: boolean; price?: boolean; description?: boolean; material?: boolean }

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

type VoiceState = 'idle' | 'listening' | 'processing'

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
  const [autoFilled, setAutoFilled] = useState<AutoFilled>({})
  const [showVariants, setShowVariants] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [syncState, setSyncState] = useState<'syncing' | 'done' | 'failed'>('syncing')
  const [failedCount, setFailedCount] = useState(0)

  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const [voiceLive, setVoiceLive] = useState('')

  const sessionCount = sessionAssets.length

  function setField<K extends keyof AssetFields>(key: K, val: AssetFields[K]) {
    setFields((f) => ({ ...f, [key]: val }))
    setAutoFilled((a) => ({ ...a, [key as keyof AutoFilled]: false }))
  }

  const applyAutoFill = useCallback((partial: Partial<AssetFields>, keys: (keyof AutoFilled)[]) => {
    setFields((f) => ({ ...f, ...partial }))
    const af: AutoFilled = {}
    keys.forEach((k) => { af[k] = true })
    setAutoFilled(af)
  }, [])

  // ── Continuous voice session ───────────────────────────────────────
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

    rec.onend = async () => {
      if (!isVoiceSessionRef.current) return
      const text = transcriptRef.current
      if (!text) {
        // silence — restart immediately
        setTimeout(() => startOneUtterance(), 200)
        return
      }

      setVoiceState('processing')
      setVoiceLive('')

      try {
        const parsed = await parseVoiceTranscript(text)
        const partial: Partial<AssetFields> = {}
        const keys: (keyof AutoFilled)[] = []
        if (parsed.name)      { partial.name      = parsed.name;                    keys.push('name') }
        if (parsed.price)     { partial.price     = parsed.price;                   keys.push('price') }
        if (parsed.priceUnit) { partial.priceUnit = parsed.priceUnit as PriceUnit }
        if (parsed.qty)       { partial.qty       = parsed.qty }

        if (keys.length > 0) {
          applyAutoFill(partial, keys)
          isVoiceSessionRef.current = false
          setVoiceState('idle')
        } else {
          // nothing extracted — keep listening
          setTimeout(() => { if (isVoiceSessionRef.current) startOneUtterance() }, 400)
        }
      } catch {
        setTimeout(() => { if (isVoiceSessionRef.current) startOneUtterance() }, 400)
      }
    }

    rec.start()
  }

  function startVoiceSession() {
    const SpeechRec = getSpeechRec()
    if (!SpeechRec) { show('Speech not supported — try Chrome'); return }
    isVoiceSessionRef.current = true
    setVoiceSessionCount(0)
    setLastSavedName('')
    startOneUtterance()
  }

  function stopVoiceSession() {
    isVoiceSessionRef.current = false
    try { recRef.current?.stop() } catch {}
    setVoiceState('idle')
    setVoiceLive('')
  }

  // ── Capture handlers ───────────────────────────────────────────────
  function handlePhotoResult(result: AIRecognitionResult, imageBase64: string) {
    const partial: Partial<AssetFields> = { imageBase64 }
    const keys: (keyof AutoFilled)[] = []
    if (result.name)           { partial.name = result.name;               keys.push('name') }
    if (result.description)    { partial.description = result.description; keys.push('description') }
    if (result.material)       { partial.material = result.material;       keys.push('material') }
    if (result.suggestedPrice) { partial.price = result.suggestedPrice;    keys.push('price') }
    if (result.category)         partial.category = result.category
    applyAutoFill(partial, keys)
    show(`✓ AI identified "${result.name ?? 'asset'}"`)
  }

  function handleBarcodeMatch(barcodeFields: Partial<AssetFields>, barcode: string) {
    const keys: (keyof AutoFilled)[] = []
    if (barcodeFields.name)  keys.push('name')
    if (barcodeFields.price) keys.push('price')
    applyAutoFill(barcodeFields, keys)
    show(`✓ Barcode matched — ${barcode}`)
  }

  // ── Manual save ────────────────────────────────────────────────────
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
    setAutoFilled({})
    setShowVariants(false)
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
      <div className="flex flex-col h-screen bg-neutral-100 max-w-md mx-auto animate-fade-in">
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
    <div className="flex flex-col h-screen bg-neutral-100 max-w-md mx-auto animate-slide-up">
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

        {/* Camera */}
        <UnifiedCaptureView
          ref={captureRef}
          onBarcodeMatch={handleBarcodeMatch}
          onBarcodeNoMatch={(code) => show(`No match for ${code}`)}
          onPhotoResult={handlePhotoResult}
          onPhotoError={(e) => show(e)}
        />

        {/* ── Voice card — tap mic, fills fields below ── */}
        <button
          type="button"
          onClick={isVoiceActive ? stopVoiceSession : startVoiceSession}
          className={`w-full mb-3 flex items-center gap-3 rounded-2xl border-[1.5px] px-4 py-3 active:scale-[0.98] transition-all ${
            voiceState === 'processing' ? 'border-neutral-200 bg-neutral-50'
            : isVoiceActive             ? 'border-error-300 bg-red-50'
            :                             'border-neutral-200 bg-white'
          }`}
        >
          {/* Mic icon */}
          <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${
            voiceState === 'processing' ? 'bg-neutral-300'
            : isVoiceActive             ? 'bg-error-500'
            : ''
          }`}
            style={
              !isVoiceActive
                ? { background: 'linear-gradient(135deg,#9E1568,#E8197D)', boxShadow: '0 3px 10px rgba(194,26,127,0.28)' }
                : voiceState === 'listening'
                ? { animation: 'chatMicPulse 1s ease-in-out infinite' }
                : undefined
            }
          >
            {voiceState === 'processing'
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Mic size={18} color="white" strokeWidth={2} />
            }
          </div>

          {/* Status text */}
          <div className="flex-1 min-w-0 text-left">
            {voiceState === 'processing' ? (
              <p className="text-[12.5px] font-bold text-neutral-600">Parsing with AI…</p>
            ) : isVoiceActive ? (
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

          {/* Waveform */}
          {voiceState === 'listening' && (
            <div className="flex items-end gap-0.5 h-5 flex-shrink-0">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="w-0.5 rounded-sm bg-error-400"
                  style={{ height: 6, animation: `wfBounce 0.9s ease-in-out ${i * 0.12}s infinite` }} />
              ))}
            </div>
          )}
        </button>

        {/* ── Name field ── */}
        <div className="mb-3">
          <div className="flex items-center gap-1 text-xs font-bold text-neutral-500 mb-1.5">
            Asset Name <span className="text-error-500">*</span>
            {autoFilled.name && <AutoTag />}
          </div>
          <input
            value={fields.name}
            onChange={(e) => setField('name', e.target.value)}
            placeholder="e.g. Folding Table"
            className={`w-full px-4 py-[13px] rounded-full text-sm font-medium outline-none transition-colors border-[1.5px] ${
              autoFilled.name
                ? 'bg-success-50 border-green-300 text-neutral-900'
                : 'bg-white border-neutral-200 focus:border-primary-600 text-neutral-900'
            }`}
          />
        </div>

        {/* ── Price + Unit + Qty ── */}
        <div className="flex gap-2 mb-4">
          <div className="flex-[3]">
            <div className="flex items-center gap-1 text-xs font-bold text-neutral-500 mb-1.5">
              Price <span className="text-error-500">*</span>
              {autoFilled.price && <AutoTag />}
            </div>
            <div className={`flex items-center border-[1.5px] rounded-full overflow-hidden transition-colors ${
              autoFilled.price ? 'bg-success-50 border-green-300' : 'bg-white border-neutral-200 focus-within:border-primary-600'
            }`}>
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

        {/* AI extras */}
        {autoFilled.description && fields.description && (
          <div className="mb-3.5">
            <div className="flex items-center gap-1 text-xs font-bold text-neutral-500 mb-1.5">Description <AutoTag /></div>
            <textarea value={fields.description} onChange={(e) => setField('description', e.target.value)}
              rows={2} className="w-full px-3.5 py-3 border-[1.5px] border-green-300 bg-success-50 rounded-xl text-sm font-medium outline-none resize-none" />
          </div>
        )}
        {autoFilled.material && fields.material && (
          <div className="mb-3.5">
            <div className="flex items-center gap-1 text-xs font-bold text-neutral-500 mb-1.5">Material <AutoTag /></div>
            <input value={fields.material} onChange={(e) => setField('material', e.target.value)}
              className="w-full px-3.5 py-3 border-[1.5px] border-green-300 bg-success-50 rounded-xl text-sm font-medium outline-none" />
          </div>
        )}

        {/* Variants */}
        <div className="mb-3">
          <button type="button"
            onClick={() => {
              const next = !showVariants
              setShowVariants(next)
              if (!next) setFields((f) => ({ ...f, variantAttributes: [], variantCombos: [] }))
            }}
            className="w-full flex items-center justify-between bg-white border-[1.5px] border-neutral-200 rounded-xl px-4 py-3">
            <div className="text-left">
              <div className="text-sm font-bold text-neutral-900">This asset has variants</div>
              <div className="text-xs font-medium text-neutral-400 mt-0.5">e.g. sizes, colors or capacities</div>
            </div>
            <ToggleSwitch on={showVariants} />
          </button>
          {showVariants && (
            <VariantBuilder
              attributes={fields.variantAttributes}
              combos={fields.variantCombos}
              onAttributesChange={(a) => setField('variantAttributes', a)}
              onCombosChange={(c) => setField('variantCombos', c)}
            />
          )}
        </div>
      </div>

      {/* ── Footer ── */}
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

function AutoTag() {
  return (
    <span className="text-[9.5px] font-extrabold text-success-600 bg-success-50 border border-green-200 rounded-full px-1.5 py-px tracking-wide ml-1">
      AUTO
    </span>
  )
}

function ToggleSwitch({ on }: { on: boolean }) {
  return (
    <div className={`w-11 h-6 rounded-full relative flex-shrink-0 transition-colors ${on ? 'bg-primary-600' : 'bg-neutral-200'}`}>
      <div className={`absolute top-[3px] left-[3px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-[18px]' : ''}`} />
    </div>
  )
}
