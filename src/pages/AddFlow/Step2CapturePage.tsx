import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScanLine, Mic, Camera, Type, CheckCircle } from 'lucide-react'
import { TopBar } from '../../components/layout/TopBar'
import { BarcodeScanner } from '../../components/capture/BarcodeScanner'
import { VoiceCapture } from '../../components/capture/VoiceCapture'
import { PhotoCapture } from '../../components/capture/PhotoCapture'
import { PriceInput } from '../../components/shared/PriceInput'
import { FormField, TextInput, TextArea } from '../../components/shared/FormField'
import { VariantBuilder } from '../../components/shared/VariantBuilder'
import { Toast, useToast } from '../../components/shared/Toast'
import { useSessionStore } from '../../stores/sessionStore'
import { useAssetsStore } from '../../stores/assetsStore'
import type { AssetFields, PriceUnit, VariantAttribute, VariantCombo, AIRecognitionResult } from '../../types/asset'

type Tab = 'photo' | 'scan' | 'speak' | 'manual'

const TABS: { id: Tab; icon: React.ReactNode; label: string }[] = [
  { id: 'photo', icon: <Camera size={18} />, label: 'Photo AI' },
  { id: 'scan', icon: <ScanLine size={18} />, label: 'Scan' },
  { id: 'speak', icon: <Mic size={18} />, label: 'Speak' },
  { id: 'manual', icon: <Type size={18} />, label: 'Manual' },
]

interface AutoFilled {
  name?: boolean
  price?: boolean
  description?: boolean
  material?: boolean
}

function makeEmptyFields(): AssetFields {
  return {
    name: '', description: '', category: '', brand: '', model: '',
    material: '', condition: '', price: '', priceUnit: 'Per Day',
    imageBase64: null, variantAttributes: [], variantCombos: [],
  }
}

export function Step2CapturePage() {
  const navigate = useNavigate()
  const { classify, sessionId } = useSessionStore()
  const { sessionAssets, addSessionAsset, commitSession } = useAssetsStore()
  const { msg, show, clear } = useToast()

  const [tab, setTab] = useState<Tab>('photo')
  const [fields, setFields] = useState<AssetFields>(makeEmptyFields())
  const [autoFilled, setAutoFilled] = useState<AutoFilled>({})
  const [showVariants, setShowVariants] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const sessionCount = sessionAssets.length

  function setField<K extends keyof AssetFields>(key: K, val: AssetFields[K]) {
    setFields((f) => ({ ...f, [key]: val }))
    setAutoFilled((a) => ({ ...a, [key]: false }))
  }

  const applyAutoFill = useCallback((partial: Partial<AssetFields>, autoKeys: (keyof AutoFilled)[]) => {
    setFields((f) => ({ ...f, ...partial }))
    const af: AutoFilled = {}
    autoKeys.forEach((k) => { af[k] = true })
    setAutoFilled(af)
  }, [])

  function handlePhotoResult(result: AIRecognitionResult, imageBase64: string) {
    const partial: Partial<AssetFields> = { imageBase64 }
    const keys: (keyof AutoFilled)[] = []
    if (result.name) { partial.name = result.name; keys.push('name') }
    if (result.description) { partial.description = result.description; keys.push('description') }
    if (result.material) { partial.material = result.material; keys.push('material') }
    if (result.suggestedPrice) { partial.price = result.suggestedPrice; keys.push('price') }
    if (result.category) partial.category = result.category
    applyAutoFill(partial, keys)
    show(`✓ AI identified — ${result.name ?? 'asset'} — fields filled`)
  }

  function handleBarcodeMatch(barcodeFields: Partial<AssetFields>, barcode: string) {
    const keys: (keyof AutoFilled)[] = []
    if (barcodeFields.name) keys.push('name')
    if (barcodeFields.price) keys.push('price')
    applyAutoFill(barcodeFields, keys)
    show(`✓ Barcode matched — ${barcode}`)
  }

  function handleVoiceResult(result: { name?: string; price?: string; priceUnit?: PriceUnit }) {
    const partial: Partial<AssetFields> = {}
    const keys: (keyof AutoFilled)[] = []
    if (result.name) { partial.name = result.name; keys.push('name') }
    if (result.price) { partial.price = result.price; keys.push('price') }
    if (result.priceUnit) partial.priceUnit = result.priceUnit
    applyAutoFill(partial, keys)
    show('✓ Voice parsed — fields filled below')
  }

  function saveAndNext() {
    if (!fields.name.trim() || !fields.price.trim()) {
      show('Add name & price before saving')
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
    show(`✓ "${fields.name}" added — ready for next`)
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

  if (showSuccess) {
    return (
      <div className="flex flex-col h-screen bg-neutral-100 max-w-md mx-auto animate-fade-in">
        <TopBar title="Session Complete" />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-success-50 border-2 border-green-200 flex items-center justify-center">
            <CheckCircle size={40} className="text-success-600" strokeWidth={2} />
          </div>
          <h2 className="text-[18px] font-extrabold text-neutral-900">
            {sessionCount + (sessionAssets.length > 0 ? sessionAssets.length : 0)} assets captured
          </h2>
          <p className="text-sm font-semibold text-neutral-400 leading-relaxed">
            Session complete for {classify.categoryIcon} {classify.category} · {classify.branch}
          </p>
        </div>
        <div className="px-4 pt-3.5 pb-5 bg-white border-t border-neutral-200 flex gap-2.5">
          <button
            onClick={() => navigate('/')}
            className="flex-1 py-3.5 rounded-lg border-[1.5px] border-neutral-200 text-sm font-bold text-neutral-500"
          >
            Back to Assets
          </button>
          <button
            onClick={() => navigate('/export')}
            className="flex-[2] py-3.5 rounded-lg text-sm font-extrabold text-white"
            style={{ background: 'linear-gradient(100deg,#9E1568,#C21A7F,#E8197D)', boxShadow: '0 4px 14px rgba(194,26,127,0.3)' }}
          >
            Export / Push to RentAsst
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-neutral-100 max-w-md mx-auto animate-slide-up">
      <TopBar title="Add Asset Session" onBack={handleBack} />

      {/* Progress */}
      <div className="flex gap-1.5 px-4 py-1.5">
        <div className="flex-1 h-1 rounded-full bg-primary-600" />
        <div className="flex-1 h-1 rounded-full bg-primary-600" />
      </div>

      {/* Session bar */}
      <div className="px-4 pt-2 pb-3 bg-white border-b border-neutral-200 flex-shrink-0">
        <div className="flex flex-wrap gap-1.5 mb-2">
          <span className="text-[11px] font-bold text-primary-700 bg-primary-50 border border-primary-200 rounded-full px-2.5 py-1">
            {classify.categoryIcon} {classify.category}
          </span>
          <span className="text-[11px] font-bold text-primary-700 bg-primary-50 border border-primary-200 rounded-full px-2.5 py-1">
            {classify.branch}
          </span>
          {classify.brand && (
            <span className="text-[11px] font-bold text-primary-700 bg-primary-50 border border-primary-200 rounded-full px-2.5 py-1">
              {classify.brand}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[11.5px] font-extrabold text-success-600 bg-success-50 border border-green-200 rounded-full px-3 py-1.5 w-fit">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
          {sessionCount} added this session
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-none px-4 py-3">
        {/* Method tabs */}
        <div className="flex bg-neutral-100 rounded-[12px] p-1 gap-0.5 mb-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-[9px] transition-all ${
                tab === t.id ? 'bg-white text-primary-600 shadow-sm' : 'text-neutral-500'
              }`}
            >
              {t.icon}
              <span className="text-[11px] font-bold">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Tab panels */}
        {tab === 'photo' && (
          <PhotoCapture onResult={handlePhotoResult} />
        )}
        {tab === 'scan' && (
          <BarcodeScanner
            onMatch={handleBarcodeMatch}
            onNoMatch={(code) => show(`No product found for ${code}`)}
          />
        )}
        {tab === 'speak' && (
          <VoiceCapture onResult={handleVoiceResult} />
        )}
        {tab === 'manual' && (
          <div className="bg-purple-50 border border-purple-200 rounded-md px-3 py-2.5 mb-3 flex gap-2.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" className="flex-shrink-0 mt-px"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
            <p className="text-[11.5px] font-semibold text-purple-700 leading-relaxed">Type the name & price directly into the fields below.</p>
          </div>
        )}

        {/* Divider */}
        <div className="flex items-center gap-2.5 my-3">
          <div className="flex-1 h-px bg-neutral-200" />
          <span className="text-[10.5px] font-extrabold text-neutral-400 uppercase tracking-wide">Asset Details</span>
          <div className="flex-1 h-px bg-neutral-200" />
        </div>

        {/* Shared fields */}
        <FormField label="Asset Name" required autoTag={autoFilled.name}>
          <TextInput
            value={fields.name}
            onChange={(e) => setField('name', e.target.value)}
            placeholder="e.g. Folding Camp Chair"
            autofilled={autoFilled.name}
          />
        </FormField>

        {autoFilled.description && fields.description && (
          <FormField label="Description" autoTag>
            <TextArea
              value={fields.description}
              onChange={(e) => setField('description', e.target.value)}
              rows={2}
              className={autoFilled.description ? 'border-green-300 bg-success-50' : ''}
            />
          </FormField>
        )}

        {autoFilled.material && fields.material && (
          <FormField label="Material" autoTag>
            <TextInput
              value={fields.material}
              onChange={(e) => setField('material', e.target.value)}
              autofilled={autoFilled.material}
            />
          </FormField>
        )}

        <FormField label="Price" required autoTag={autoFilled.price}>
          <PriceInput
            price={fields.price}
            unit={fields.priceUnit}
            onPriceChange={(v) => setField('price', v)}
            onUnitChange={(u) => setField('priceUnit', u)}
            autofilled={autoFilled.price}
          />
        </FormField>

        {/* Variants toggle */}
        <div className="mb-3">
          <button
            type="button"
            onClick={() => {
              const next = !showVariants
              setShowVariants(next)
              if (!next) setFields((f) => ({ ...f, variantAttributes: [], variantCombos: [] }))
            }}
            className="w-full flex items-center justify-between bg-white border-[1.5px] border-neutral-200 rounded-md px-3.5 py-3"
          >
            <div className="text-left">
              <div className="text-sm font-bold text-neutral-900">This asset has variants</div>
              <div className="text-xs font-medium text-neutral-400 mt-0.5">e.g. different sizes, colors or capacities</div>
            </div>
            <ToggleSwitch on={showVariants} onToggle={() => {}} />
          </button>

          {showVariants && (
            <VariantBuilder
              attributes={fields.variantAttributes}
              combos={fields.variantCombos}
              onAttributesChange={(attrs) => setField('variantAttributes', attrs)}
              onCombosChange={(combos) => setField('variantCombos', combos)}
            />
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 pt-3 pb-5 bg-white border-t border-neutral-200 flex gap-2.5 flex-shrink-0">
        <button
          onClick={finishSession}
          className="flex-1 py-3.5 rounded-lg border-[1.5px] border-neutral-200 text-sm font-bold text-neutral-500"
        >
          Finish ({sessionCount})
        </button>
        <button
          onClick={saveAndNext}
          className="flex-[2] py-3.5 rounded-lg text-sm font-extrabold text-white"
          style={{ background: 'linear-gradient(100deg,#9E1568,#C21A7F,#E8197D)', boxShadow: '0 4px 14px rgba(194,26,127,0.3)' }}
        >
          Save &amp; Add Next
        </button>
      </div>

      <Toast message={msg} onDone={clear} />
    </div>
  )
}

function ToggleSwitch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onToggle() }}
      className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors flex-shrink-0 ${on ? 'bg-primary-600' : 'bg-neutral-200'}`}
    >
      <div className={`absolute top-[3px] left-[3px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-[18px]' : ''}`} />
    </div>
  )
}
