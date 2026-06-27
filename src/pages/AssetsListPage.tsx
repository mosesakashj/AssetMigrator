import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, FileDown, Loader, Plus, Package } from 'lucide-react'
import { useAssetsStore } from '../stores/assetsStore'
import { mockApiPush } from '../services/apiService'
import { AssetCard } from '../components/asset/AssetCard'
import { TopBar } from '../components/layout/TopBar'

export function AssetsListPage() {
  const navigate = useNavigate()
  const { assets, clearNewBadges, setAssetsPushStatus, retryFailedAssets } = useAssetsStore()
  const [retrying, setRetrying] = useState(false)

  useEffect(() => {
    const t = setTimeout(clearNewBadges, 4000)
    return () => clearTimeout(t)
  }, [assets, clearNewBadges])

  const failedAssets = assets.filter((a) => a.pushStatus === 'failed')

  async function handleRetry() {
    setRetrying(true)
    const toRetry = retryFailedAssets()
    try {
      const result = await mockApiPush(toRetry)
      const failedIds = result.failedIds ?? []
      const succeededIds = toRetry.map((a) => a.id).filter((id) => !failedIds.includes(id))
      if (succeededIds.length > 0) setAssetsPushStatus(succeededIds, 'queued')
      if (failedIds.length > 0) setAssetsPushStatus(failedIds, 'failed')
    } catch {
      setAssetsPushStatus(toRetry.map((a) => a.id), 'failed')
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-neutral-100 max-w-md mx-auto relative">
      <TopBar
        title="Assets"
        right={
          assets.length > 0 ? (
            <button
              onClick={() => navigate('/export')}
              className="flex items-center gap-1.5 text-xs font-bold text-primary-600 bg-primary-50 border border-primary-200 rounded-full px-3 py-1.5"
            >
              <FileDown size={13} /> Export
            </button>
          ) : undefined
        }
      />

      {failedAssets.length > 0 && (
        <div className="mx-3 mt-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 flex items-center justify-between gap-2 animate-fade-in flex-shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-red-500 flex-shrink-0" />
            <p className="text-[12px] font-bold text-red-700">
              {failedAssets.length} asset{failedAssets.length !== 1 ? 's' : ''} failed to sync
            </p>
          </div>
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="text-[11px] font-extrabold text-white bg-red-500 rounded-full px-3 py-1 disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
          >
            {retrying && <Loader size={11} className="animate-spin" />}
            {retrying ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-none relative">
        {assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 text-neutral-400 text-center px-8 pt-20">
            <Package size={44} strokeWidth={1.2} />
            <p className="text-sm font-semibold">No assets yet. Tap + to start a capture session.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 p-3">
            {assets.map((asset, i) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                style={{ animationDelay: `${i * 0.04}s` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate('/add/step1')}
        className="absolute bottom-8 right-4 w-14 h-14 rounded-[18px] flex items-center justify-center z-20"
        style={{
          background: 'linear-gradient(135deg,#9E1568,#E8197D)',
          boxShadow: '0 6px 20px rgba(194,26,127,0.38),0 2px 6px rgba(194,26,127,0.18)',
        }}
      >
        <Plus size={24} color="white" strokeWidth={2.4} />
      </button>
    </div>
  )
}
