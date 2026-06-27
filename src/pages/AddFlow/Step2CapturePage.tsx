import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, ScanLine, Sparkles } from 'lucide-react'
import { TopBar } from '../../components/layout/TopBar'
import { UnifiedCaptureView, type UnifiedCaptureHandle, type CaptureMode } from '../../components/capture/UnifiedCaptureView'
import { ChatInputField } from '../../components/capture/ChatInputField'
import { VariantBuilder } from '../../components/shared/VariantBuilder'
import { Toast, useToast } from '../../components/shared/Toast'
import { useSessionStore } from '../../stores/sessionStore'
import { useAssetsStore } from '../../stores/assetsStore'
import { parseVoiceTranscript } from '../../services/aiService'
import type { AssetFields, PriceUnit, AIRecognitionResult } from '../../types/asset'

interface AutoFilled { name?: boolean; price?: boolean; description?: boolean; material?: boolean }

function makeEmptyFields(): AssetFields {
  return {
    name: '', description: '', category: '', brand: '', model: '',
    material: '', condition: '', price: '', qty: '', priceUnit: 'Per Day',
    imageBase64: null, variantAttributes: [], variantCombos: [],
  }
}

const PRICE_UNITS: PriceUnit[] = ['Per Day', 'Per Hour', 'Flat']

export function Step2CapturePage() {
  const navigate = useNavigate()
  const { classify, sessionId } = useSessionStore()
  const { sessionAssets, addSessionAsset, commitSession } = useAssetsStore()
  const { msg, show, clear } = useToast()

  const captureRef = useRef<UnifiedCaptureHandle>(null)
  const [captureMode, setCaptureMode] = useState<CaptureMode>('scan')

  const [fields, setFields] = useState<AssetFields>(makeEmptyFields())
  const [autoFilled, setAutoFilled] = useState<AutoFilled>({})
  const [showVariants, setShowVariants] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
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

  // ── Capture handlers ──────────────────────────────────────────────
  function handlePhotoResult(result: AIRecognitionResult, imageBase64: string) {
    const partial: Partial<AssetFields> = { imageBase64 }
    const keys: (keyof AutoFilled)[] = []
    if (result.name)          { partial.name = result.name;                   keys.push('name') }
    if (result.description)   { partial.description = result.description;     keys.push('description') }
    if (result.material)      { partial.material = result.material;           keys.push('material') }
    if (result.suggestedPrice){ partial.price = result.suggestedPrice;        keys.push('price') }
    if (result.category)        partial.category = result.category
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

  // ── Per-field voice ───────────────────────────────────────────────
  async function handleNameVoice(transcript: string) {
    const parsed = await parseVoiceTranscript(transcript)
    const name = parsed.name ?? transcript
    setFields((f) => ({ ...f, name }))
    setAutoFilled((a) => ({ ...a, name: true }))
    show(`✓ "${name}"`)
  }

  async function handlePriceVoice(transcript: string) {
    const parsed = await parseVoiceTranscript(transcript)
    const price = parsed.price ?? transcript.match(/\d+/)?.[0] ?? ''
    const priceUnit = (parsed.priceUnit as PriceUnit) ?? fields.priceUnit
    setFields((f) => ({ ...f, price, priceUnit }))
    setAutoFilled((a) => ({ ...a, price: true }))
    if (price) show(`✓ Price ₹${price}`)
  }

  // ── Save / Finish ─────────────────────────────────────────────────
  function saveAndNext() {
    if (!fields.name.trim() || !fields.price.trim()) {
      show('Name and price are required')
      return
    }
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
    setFields(makeEmptyFields())
    setAutoFilled({})
    setShowVariants(false)
  }

  function finishSession() {
    commitSession()
    setShowSuccess(true)
  }

  function handleBack() {
    if (sessionCount > 0) finishSession()
    else navigate('/add/step1')
  }

  // ── Success ───────────────────────────────────────────────────────
  if (showSuccess) {
    return (
      <div className="flex flex-col h-screen bg-neutral-100 max-w-md mx-auto animate-fade-in">
        <TopBar title="Session Complete" />
        <div className="flex-1 flex flex-col items-center justify-center gap-5 px-8 text-center">
          <div className="w-24 h-24 rounded-full bg-success-50 border-2 border-green-200 flex items-center justify-center shadow-md">
            <CheckCircle size={44} className="text-success-600" strokeWidth={1.8} />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-neutral-900">
              {sessionCount} asset{sessionCount !== 1 ? 's' : ''} captured
            </h2>
            <p className="text-sm font-semibold text-neutral-400 mt-2 leading-relaxed">
              {classify.categoryIcon} {classify.category} · {classify.branch}
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

  // ── Main capture ──────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-neutral-100 max-w-md mx-auto animate-slide-up">
      <TopBar title="Add Asset Session" onBack={handleBack} />

      {/* Progress + session bar */}
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

        {/* Capture view (auto-starts barcode scanner) */}
        <UnifiedCaptureView
          ref={captureRef}
          onBarcodeMatch={handleBarcodeMatch}
          onBarcodeNoMatch={(code) => show(`No match for ${code}`)}
          onPhotoResult={handlePhotoResult}
          onPhotoError={(e) => show(e)}
          onModeChange={setCaptureMode}
        />

        {/* Row 1 — Name */}
        <ChatInputField
          label="Asset Name"
          required
          autoTag={autoFilled.name}
          placeholder="Type or tap 🎤 to speak"
          value={fields.name}
          autofilled={autoFilled.name}
          onChange={(v) => setField('name', v)}
          onVoiceResult={handleNameVoice}
        />

        {/* Row 2 — Price + Qty */}
        <div className="flex gap-2 items-start">
          <div className="flex-[3]">
            <ChatInputField
              label="Price"
              required
              autoTag={autoFilled.price}
              prefix="₹"
              placeholder="0"
              value={fields.price}
              autofilled={autoFilled.price}
              inputMode="decimal"
              onChange={(v) => setField('price', v)}
              onVoiceResult={handlePriceVoice}
            />
          </div>
          <div className="flex-[2]">
            <div className="text-xs font-bold text-neutral-500 mb-1.5">Qty</div>
            <input
              type="number"
              inputMode="numeric"
              value={fields.qty}
              onChange={(e) => setField('qty', e.target.value)}
              placeholder="0"
              className="w-full px-4 py-[13px] bg-white border-[1.5px] border-neutral-200 rounded-full text-sm font-medium text-neutral-900 text-center outline-none focus:border-primary-600 transition-colors"
            />
          </div>
        </div>

        {/* Price unit toggle */}
        <div className="flex bg-neutral-100 rounded-[10px] p-1 gap-0.5 mb-4 mt-1">
          {PRICE_UNITS.map((u) => (
            <button key={u} type="button" onClick={() => setField('priceUnit', u)}
              className={`flex-1 py-2 rounded-[8px] text-xs font-bold transition-all ${
                fields.priceUnit === u ? 'bg-primary-600 text-white' : 'text-neutral-500'}`}>
              {u}
            </button>
          ))}
        </div>

        {/* AI auto-filled extras */}
        {autoFilled.description && fields.description && (
          <div className="mb-3.5">
            <div className="flex items-center gap-1 text-xs font-bold text-neutral-500 mb-1.5">
              Description
              <span className="text-[9.5px] font-extrabold text-success-600 bg-success-50 border border-green-200 rounded-full px-1.5 py-px tracking-wide ml-1">AUTO</span>
            </div>
            <textarea value={fields.description} onChange={(e) => setField('description', e.target.value)}
              rows={2} className="w-full px-3.5 py-3 border-[1.5px] border-green-300 bg-success-50 rounded-md text-sm font-medium outline-none resize-none" />
          </div>
        )}
        {autoFilled.material && fields.material && (
          <div className="mb-3.5">
            <div className="flex items-center gap-1 text-xs font-bold text-neutral-500 mb-1.5">
              Material
              <span className="text-[9.5px] font-extrabold text-success-600 bg-success-50 border border-green-200 rounded-full px-1.5 py-px tracking-wide ml-1">AUTO</span>
            </div>
            <input value={fields.material} onChange={(e) => setField('material', e.target.value)}
              className="w-full px-3.5 py-3 border-[1.5px] border-green-300 bg-success-50 rounded-md text-sm font-medium outline-none" />
          </div>
        )}

        {/* Variants toggle */}
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

      {/* ── Footer: Finish | Capture | Save & Add Next ── */}
      <div className="px-4 pt-3 pb-5 bg-white border-t border-neutral-200 flex gap-2 flex-shrink-0">
        {/* Finish */}
        <button onClick={finishSession}
          className="flex-1 py-3.5 rounded-xl border-[1.5px] border-neutral-200 text-xs font-bold text-neutral-500 leading-tight">
          Finish<br />
          <span className="text-[10px] font-medium">({sessionCount})</span>
        </button>

        {/* Capture */}
        <button
          type="button"
          onClick={() => captureRef.current?.triggerCapture()}
          className="flex-1 py-3.5 rounded-xl border-[1.5px] border-primary-200 bg-primary-50 text-primary-600 flex flex-col items-center justify-center gap-0.5"
        >
          {captureMode === 'photo'
            ? <><Sparkles size={16} /><span className="text-[10px] font-bold mt-0.5">AI Capture</span></>
            : <><ScanLine size={16} /><span className="text-[10px] font-bold mt-0.5">Scan</span></>
          }
        </button>

        {/* Save */}
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

function ToggleSwitch({ on }: { on: boolean }) {
  return (
    <div className={`w-11 h-6 rounded-full relative flex-shrink-0 transition-colors ${on ? 'bg-primary-600' : 'bg-neutral-200'}`}>
      <div className={`absolute top-[3px] left-[3px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-[18px]' : ''}`} />
    </div>
  )
}
