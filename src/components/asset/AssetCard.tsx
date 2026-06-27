import type { SavedAsset } from '../../types/asset'

interface AssetCardProps {
  asset: SavedAsset
  style?: React.CSSProperties
}

export function AssetCard({ asset, style }: AssetCardProps) {
  const badge =
    asset.pushStatus === 'failed' ? (
      <span className="absolute top-2 right-2 text-[8.5px] font-extrabold tracking-wide text-red-600 bg-red-50 border border-red-200 rounded-full px-1.5 py-px flex items-center gap-0.5">
        <span className="w-1 h-1 rounded-full bg-red-500 inline-block" />
        FAILED
      </span>
    ) : asset.pushStatus === 'pending' ? (
      <span className="absolute top-2 right-2">
        <span className="w-3 h-3 border-[1.5px] border-neutral-400 border-t-transparent rounded-full animate-spin inline-block" />
      </span>
    ) : asset.isNew ? (
      <span className="absolute top-2 right-2 text-[8.5px] font-extrabold tracking-wide text-success-600 bg-success-50 border border-green-200 rounded-full px-1.5 py-px">
        NEW
      </span>
    ) : null

  return (
    <div
      className="flex gap-3 bg-white border border-neutral-200 rounded-lg shadow-sm p-3 relative animate-asset-in"
      style={style}
    >
      {badge}
      {asset.imageBase64 ? (
        <img
          src={`data:image/jpeg;base64,${asset.imageBase64}`}
          alt={asset.name}
          className="w-14 h-14 rounded-[11px] object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-14 h-14 rounded-[11px] bg-primary-50 flex-shrink-0 flex items-center justify-center text-2xl">
          {getCategoryIcon(asset.category)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-extrabold text-neutral-900 tracking-tight truncate">{asset.name}</div>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {asset.price && (
            <span className="text-[10px] font-bold text-primary-700 bg-primary-50 border border-primary-200 rounded-full px-2 py-0.5">
              ₹{asset.price} / {asset.priceUnit.replace('Per ', '')}
            </span>
          )}
          {asset.variantCombos.length > 0 && (
            <span className="text-[10px] font-bold text-purple-600 bg-purple-50 border border-purple-200 rounded-full px-2 py-0.5">
              {asset.variantCombos.length} variants
            </span>
          )}
          {asset.branch && (
            <span className="text-[10px] font-bold text-neutral-500 bg-neutral-100 border border-neutral-200 rounded-full px-2 py-0.5">
              {asset.branch}
            </span>
          )}
          {asset.material && (
            <span className="text-[10px] font-bold text-teal-600 bg-teal-50 border border-teal-200 rounded-full px-2 py-0.5">
              {asset.material}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function getCategoryIcon(category: string): string {
  const map: Record<string, string> = {
    Jewellery: '💍', Camping: '⛺', 'Power Tools': '🔧', Event: '🎉',
    'AV Equip.': '📷', Mobility: '🚲', Medical: '🏥', Costumes: '👗', Other: '📦',
  }
  return map[category] ?? '📦'
}
