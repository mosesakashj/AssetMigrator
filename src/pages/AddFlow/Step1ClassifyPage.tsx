import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '../../components/layout/TopBar'
import { useSessionStore } from '../../stores/sessionStore'
import { useAssetsStore } from '../../stores/assetsStore'
import { CATEGORIES, BRANDS, BRANCHES } from '../../types/asset'
import type { AssetCategory } from '../../types/asset'

export function Step1ClassifyPage() {
  const navigate = useNavigate()
  const { setClassify, newSession } = useSessionStore()
  const { clearSessionAssets } = useAssetsStore()

  const [selectedCat, setSelectedCat] = useState<{ label: string; icon: string }>(CATEGORIES[0])
  const [brand, setBrand] = useState(BRANDS[0])
  const [model, setModel] = useState('')
  const [branch, setBranch] = useState(BRANCHES[0])

  function handleNext() {
    newSession()
    clearSessionAssets()
    setClassify({
      category: selectedCat.label as AssetCategory,
      categoryIcon: selectedCat.icon,
      brand,
      model,
      branch,
    })
    navigate('/add/step2')
  }

  return (
    <div className="flex flex-col h-screen bg-neutral-100 max-w-md mx-auto animate-slide-up">
      <TopBar title="Add Asset" onBack={() => navigate('/')} />

      {/* Progress */}
      <div className="flex gap-1.5 px-4 py-1.5">
        <div className="flex-1 h-1 rounded-full bg-primary-600" />
        <div className="flex-1 h-1 rounded-full bg-neutral-200" />
      </div>
      <p className="text-[11px] font-extrabold uppercase tracking-wide text-neutral-400 px-4 mb-2">Step 1 of 2 — Classify</p>

      <div className="flex-1 overflow-y-auto scrollbar-none px-4 pb-4">
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-neutral-400 mt-3 mb-2">Category</p>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.label}
              type="button"
              onClick={() => setSelectedCat(cat)}
              className={`flex flex-col items-center gap-1.5 py-3 px-1.5 border-[1.5px] rounded-md transition-all ${
                selectedCat.label === cat.label
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-neutral-200 bg-white'
              }`}
            >
              <span className="text-xl">{cat.icon}</span>
              <span className="text-[10.5px] font-bold text-neutral-900 text-center leading-tight">{cat.label}</span>
            </button>
          ))}
        </div>

        <p className="text-[11px] font-extrabold uppercase tracking-wide text-neutral-400 mt-4 mb-2">Brand</p>
        <div className="relative">
          <select
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="w-full px-3.5 py-3 bg-white border-[1.5px] border-neutral-200 rounded-md text-sm font-medium text-neutral-900 outline-none appearance-none"
          >
            {BRANDS.map((b) => <option key={b}>{b}</option>)}
            <option>+ Add new brand…</option>
          </select>
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1 2.5l3.5 4 3.5-4" stroke="#A1A1AA" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </div>
        </div>

        <p className="text-[11px] font-extrabold uppercase tracking-wide text-neutral-400 mt-4 mb-2">Model <span className="normal-case font-medium text-neutral-300">(optional)</span></p>
        <input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="e.g. GSB 13 RE / Camp 4 Dome"
          className="w-full px-3.5 py-3 bg-white border-[1.5px] border-neutral-200 rounded-md text-sm font-medium text-neutral-900 outline-none focus:border-primary-600"
        />

        <p className="text-[11px] font-extrabold uppercase tracking-wide text-neutral-400 mt-4 mb-2">Branch</p>
        <div className="flex flex-col gap-1.5">
          {BRANCHES.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBranch(b)}
              className={`flex items-center gap-2.5 px-3 py-2.5 border-[1.5px] rounded-md transition-all ${
                branch === b ? 'border-primary-600 bg-primary-50' : 'border-neutral-200 bg-white'
              }`}
            >
              <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0 ${branch === b ? 'bg-primary-100 text-primary-600' : 'bg-neutral-100 text-neutral-500'}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-6 9 6v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/></svg>
              </div>
              <span className="flex-1 text-sm font-bold text-neutral-900 text-left">{b}</span>
              <div className={`w-[18px] h-[18px] rounded-full border-2 flex-shrink-0 ${branch === b ? 'border-primary-600 bg-primary-600 shadow-[inset_0_0_0_3px_white]' : 'border-neutral-300'}`} />
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-3.5 pb-5 bg-white border-t border-neutral-200">
        <button
          onClick={handleNext}
          className="w-full py-3.5 rounded-lg text-sm font-extrabold text-white"
          style={{ background: 'linear-gradient(100deg,#9E1568,#C21A7F,#E8197D)', boxShadow: '0 4px 14px rgba(194,26,127,0.3)' }}
        >
          Next: Capture Details
        </button>
      </div>
    </div>
  )
}
