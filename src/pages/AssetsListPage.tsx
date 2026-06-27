import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Package, FileDown } from 'lucide-react'
import { useAssetsStore } from '../stores/assetsStore'
import { AssetCard } from '../components/asset/AssetCard'
import { TopBar } from '../components/layout/TopBar'

export function AssetsListPage() {
  const navigate = useNavigate()
  const { assets, clearNewBadges } = useAssetsStore()

  useEffect(() => {
    const t = setTimeout(clearNewBadges, 4000)
    return () => clearTimeout(t)
  }, [assets, clearNewBadges])

  return (
    <div className="flex flex-col h-screen bg-neutral-100 max-w-md mx-auto">
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
