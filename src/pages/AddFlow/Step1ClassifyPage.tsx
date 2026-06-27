import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, X } from 'lucide-react'
import { TopBar } from '../../components/layout/TopBar'
import { BrandComboBox } from '../../components/shared/BrandComboBox'
import { useSessionStore } from '../../stores/sessionStore'
import { useAssetsStore } from '../../stores/assetsStore'
import { CATEGORIES, BRANCHES } from '../../types/asset'
import type { AssetCategory, PriceUnit } from '../../types/asset'

const PRICE_UNITS: { value: PriceUnit; label: string; desc: string }[] = [
  { value: 'Per Day', label: '/Day', desc: 'Daily rental' },
  { value: 'Per Hour', label: '/Hr', desc: 'Hourly rental' },
  { value: 'Flat', label: 'Flat', desc: 'One-time fee' },
]

export function Step1ClassifyPage() {
  const navigate = useNavigate()
  const { setClassify, newSession } = useSessionStore()
  const { clearSessionAssets } = useAssetsStore()

  // selectedCats holds both preset and custom-added labels
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set([CATEGORIES[0].label]))
  // extra categories the user added via quick-add (not in CATEGORIES)
  const [extraCats, setExtraCats] = useState<string[]>([])
  const [catQuery, setCatQuery] = useState('')
  const [catOpen, setCatOpen] = useState(false)
  const catInputRef = useRef<HTMLInputElement>(null)

  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [branch, setBranch] = useState(BRANCHES[0])
  const [priceUnit, setPriceUnit] = useState<PriceUnit>('Per Day')

  const allCats = [...CATEGORIES, ...extraCats.map((l) => ({ label: l, icon: '🏷️' }))]

  const filtered = catQuery.trim()
    ? allCats.filter((c) => c.label.toLowerCase().includes(catQuery.toLowerCase()))
    : allCats

  const isNew = catQuery.trim().length > 0 &&
    !allCats.some((c) => c.label.toLowerCase() === catQuery.trim().toLowerCase())

  function toggleCat(label: string) {
    setSelectedCats((prev) => {
      const next = new Set(prev)
      if (next.has(label)) { if (next.size > 1) next.delete(label) }
      else next.add(label)
      return next
    })
  }

  function addCustomCat(label: string) {
    const trimmed = label.trim()
    if (!trimmed) return
    if (!allCats.some((c) => c.label.toLowerCase() === trimmed.toLowerCase())) {
      setExtraCats((prev) => [...prev, trimmed])
    }
    setSelectedCats((prev) => new Set([...prev, trimmed]))
    setCatQuery('')
    setCatOpen(false)
    catInputRef.current?.blur()
  }

  function selectFromDropdown(label: string) {
    toggleCat(label)
    setCatQuery('')
    setCatOpen(false)
    catInputRef.current?.blur()
  }

  const firstCat = CATEGORIES.find((c) => selectedCats.has(c.label))
  const finalIcon = firstCat ? firstCat.icon : '🏷️'
  const allSelected = [...selectedCats]

  function handleNext() {
    newSession()
    clearSessionAssets()
    setClassify({
      category: allSelected.join(', ') as AssetCategory,
      categoryIcon: finalIcon,
      brand,
      model,
      branch,
      priceUnit,
    })
    navigate('/add/step2')
  }

  return (
    <div className="flex flex-col h-screen bg-neutral-100 max-w-md mx-auto animate-slide-up">
      <TopBar title="Add Asset" onBack={() => navigate('/')} />

      {/* Progress */}
      <div className="flex gap-1.5 px-4 py-2 bg-white border-b border-neutral-200 flex-shrink-0">
        <div className="flex-1 h-1 rounded-full bg-primary-600" />
        <div className="flex-1 h-1 rounded-full bg-neutral-200" />
      </div>
      <p className="text-[11px] font-extrabold uppercase tracking-wide text-neutral-400 px-4 pt-2.5 pb-1 bg-white border-b border-neutral-200 flex-shrink-0">
        Step 1 of 2 — Classify
      </p>

      <div className="flex-1 overflow-y-auto scrollbar-none px-4 pb-6">

        {/* ── Category ── */}
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-neutral-400 mt-4 mb-2">Category</p>

        {/* Selected chips */}
        {selectedCats.size > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {[...selectedCats].map((label) => {
              const cat = allCats.find((c) => c.label === label)
              return (
                <span key={label} className="flex items-center gap-1 text-[11px] font-bold text-primary-700 bg-primary-50 border border-primary-200 rounded-full pl-2 pr-1 py-1">
                  {cat?.icon} {label}
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); toggleCat(label) }}
                    className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-primary-200 transition-colors ml-0.5"
                    aria-label={`Remove ${label}`}
                  >
                    <X size={9} strokeWidth={3} className="text-primary-600" />
                  </button>
                </span>
              )
            })}
          </div>
        )}

        {/* Search combobox */}
        <div className="relative">
          <input
            ref={catInputRef}
            value={catQuery}
            onChange={(e) => { setCatQuery(e.target.value); setCatOpen(true) }}
            onFocus={() => setCatOpen(true)}
            onBlur={() => setTimeout(() => setCatOpen(false), 150)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && catQuery.trim()) {
                e.preventDefault()
                isNew ? addCustomCat(catQuery) : selectFromDropdown(filtered[0]?.label ?? catQuery.trim())
              }
            }}
            placeholder="Search or add a category…"
            className="w-full px-3.5 py-3 bg-white border-[1.5px] border-neutral-200 rounded-[14px] text-sm font-medium text-neutral-900 outline-none focus:border-primary-600 transition-colors"
          />
          {catOpen && (filtered.length > 0 || isNew) && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-[14px] shadow-md z-30 overflow-hidden">
              {filtered.map((cat) => {
                const active = selectedCats.has(cat.label)
                return (
                  <button
                    key={cat.label}
                    type="button"
                    onMouseDown={() => selectFromDropdown(cat.label)}
                    className={`w-full text-left px-4 py-2.5 text-sm font-medium flex items-center gap-2.5 transition-colors ${
                      active ? 'text-primary-600 font-bold bg-primary-50' : 'text-neutral-700 hover:bg-primary-50 hover:text-primary-700'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span className="flex-1">{cat.label}</span>
                    {active && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><path d="M20 6L9 17l-5-5"/></svg>
                    )}
                  </button>
                )
              })}
              {isNew && (
                <button
                  type="button"
                  onMouseDown={() => addCustomCat(catQuery)}
                  className="w-full text-left px-4 py-2.5 text-sm font-bold text-primary-600 flex items-center gap-2 border-t border-neutral-100 hover:bg-primary-50 transition-colors"
                >
                  <Plus size={14} /> Add "{catQuery.trim()}"
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Brand ── */}
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-neutral-400 mt-4 mb-2">
          Brand <span className="normal-case font-medium text-neutral-300">(optional)</span>
        </p>
        <BrandComboBox value={brand} onChange={setBrand} />

        {/* ── Model ── */}
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-neutral-400 mt-4 mb-2">
          Model <span className="normal-case font-medium text-neutral-300">(optional)</span>
        </p>
        <input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="e.g. GSB 13 RE / Camp 4 Dome"
          className="w-full px-3.5 py-3 bg-white border-[1.5px] border-neutral-200 rounded-md text-sm font-medium text-neutral-900 outline-none focus:border-primary-600 transition-colors"
        />

        {/* ── Branch ── */}
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-neutral-400 mt-4 mb-2">Branch</p>
        <div className="flex flex-col gap-1.5">
          {BRANCHES.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBranch(b)}
              className={`flex items-center gap-3 px-3 py-2.5 border-[1.5px] rounded-[14px] transition-all ${
                branch === b ? 'border-primary-600 bg-primary-50' : 'border-neutral-200 bg-white hover:border-primary-200'
              }`}
            >
              <div className={`w-9 h-9 rounded-[11px] flex items-center justify-center flex-shrink-0 transition-colors ${
                branch === b ? 'bg-primary-100 text-primary-600' : 'bg-neutral-100 text-neutral-400'
              }`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M3 9l9-6 9 6v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>
                </svg>
              </div>
              <span className="flex-1 text-sm font-bold text-neutral-900 text-left">{b}</span>
              <div className={`w-[18px] h-[18px] rounded-full border-2 flex-shrink-0 transition-all ${
                branch === b ? 'border-primary-600 bg-primary-600 shadow-[inset_0_0_0_3px_white]' : 'border-neutral-300'
              }`} />
            </button>
          ))}
        </div>

        {/* ── Pricing Method ── */}
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-neutral-400 mt-4 mb-2">Pricing Method</p>
        <div className="flex gap-2">
          {PRICE_UNITS.map((u) => (
            <button
              key={u.value}
              type="button"
              onClick={() => setPriceUnit(u.value)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 px-1 border-[1.5px] rounded-[14px] transition-all ${
                priceUnit === u.value
                  ? 'border-primary-600 bg-primary-50 shadow-sm'
                  : 'border-neutral-200 bg-white hover:border-primary-200'
              }`}
            >
              <span className={`text-sm font-extrabold ${priceUnit === u.value ? 'text-primary-600' : 'text-neutral-700'}`}>
                {u.label}
              </span>
              <span className="text-[10px] font-medium text-neutral-400 text-center leading-tight">{u.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-3.5 pb-5 bg-white border-t border-neutral-200">
        <button
          onClick={handleNext}
          className="w-full py-4 rounded-xl text-sm font-extrabold text-white transition-opacity"
          style={{ background: 'linear-gradient(100deg,#9E1568,#C21A7F,#E8197D)', boxShadow: '0 4px 14px rgba(194,26,127,0.3)' }}
        >
          Next: Capture Details →
        </button>
      </div>
    </div>
  )
}
