import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileDown, Send, CheckCircle2, Loader } from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { AssetCard } from '../components/asset/AssetCard'
import { useAssetsStore } from '../stores/assetsStore'
import { exportAssetsToExcel } from '../services/excelService'
import { mockApiPush } from '../services/apiService'
import { Toast, useToast } from '../components/shared/Toast'

export function ExportPage() {
  const navigate = useNavigate()
  const { assets } = useAssetsStore()
  const { msg, show, clear } = useToast()
  const [pushing, setPushing] = useState(false)
  const [pushed, setPushed] = useState<string | null>(null)

  const unpushedAssets = assets.filter(
    (a) => a.pushStatus === 'failed' || a.pushStatus === undefined
  )

  async function handlePush() {
    setPushing(true)
    try {
      const result = await mockApiPush(unpushedAssets)
      setPushed(result.message)
      show('✓ ' + result.message)
    } catch {
      show('Push failed — please retry')
    } finally {
      setPushing(false)
    }
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-neutral-100 max-w-md mx-auto animate-slide-up">
      <TopBar title="Export Assets" onBack={() => navigate('/')} />

      {/* Stats bar */}
      <div className="px-4 py-3 bg-white border-b border-neutral-200 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-neutral-400">Total Assets</p>
          <p className="text-2xl font-extrabold text-primary-600 mt-0.5">{assets.length}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="text-xs font-bold text-success-600 bg-success-50 border border-green-200 rounded-full px-2.5 py-1">
            {new Set(assets.map((a) => a.branch)).size} branches
          </div>
          <div className="text-xs font-bold text-purple-600 bg-purple-50 border border-purple-200 rounded-full px-2.5 py-1">
            {assets.filter((a) => a.variantCombos.length > 0).length} with variants
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-none px-4 py-3 flex flex-col gap-2">
        {assets.map((asset) => (
          <AssetCard key={asset.id} asset={asset} />
        ))}
      </div>

      {/* Push success banner */}
      {pushed && (
        <div className="mx-4 mb-2 bg-success-50 border border-green-200 rounded-md px-3 py-2.5 flex items-start gap-2.5 animate-fade-in">
          <CheckCircle2 size={18} className="text-success-600 flex-shrink-0 mt-0.5" />
          <p className="text-[11.5px] font-semibold text-success-600 leading-snug">{pushed}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="px-4 pt-3 pb-5 bg-white border-t border-neutral-200 flex flex-col gap-2.5 flex-shrink-0">
        <button
          onClick={() => exportAssetsToExcel(assets)}
          disabled={assets.length === 0}
          className="w-full py-3.5 rounded-lg border-[1.5px] border-primary-600 bg-primary-50 text-primary-600 text-sm font-extrabold flex items-center justify-center gap-2 disabled:opacity-40"
        >
          <FileDown size={16} /> Export Excel (.xlsx)
        </button>
        <button
          onClick={handlePush}
          disabled={pushing || unpushedAssets.length === 0 || !!pushed}
          className="w-full py-3.5 rounded-lg text-sm font-extrabold text-white flex items-center justify-center gap-2 disabled:opacity-40"
          style={{ background: 'linear-gradient(100deg,#9E1568,#C21A7F,#E8197D)', boxShadow: '0 4px 14px rgba(194,26,127,0.3)' }}
        >
          {pushing ? (
            <><Loader size={16} className="animate-spin-slow" /> Pushing to RentAsst…</>
          ) : pushed ? (
            <><CheckCircle2 size={16} /> Pushed Successfully</>
          ) : (
            <><Send size={16} /> Push to RentAsst</>
          )}
        </button>
      </div>

      <Toast message={msg} onDone={clear} />
    </div>
  )
}
