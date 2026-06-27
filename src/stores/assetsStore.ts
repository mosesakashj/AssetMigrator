import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SavedAsset, PushStatus } from '../types/asset'

interface AssetsState {
  assets: SavedAsset[]
  sessionAssets: SavedAsset[]
  addSessionAsset: (asset: SavedAsset) => void
  commitSession: () => void
  clearSessionAssets: () => void
  clearNewBadges: () => void
  setAssetsPushStatus: (ids: string[], status: PushStatus) => void
  retryFailedAssets: () => SavedAsset[]
}

export const useAssetsStore = create<AssetsState>()(
  persist(
    (set, get) => ({
      assets: [],
      sessionAssets: [],
      addSessionAsset: (asset) =>
        set((s) => ({ sessionAssets: [...s.sessionAssets, asset] })),
      commitSession: () =>
        set((s) => ({
          assets: [...s.sessionAssets.map((a) => ({ ...a, isNew: true, pushStatus: 'pending' as PushStatus })), ...s.assets],
          sessionAssets: [],
        })),
      clearSessionAssets: () => set({ sessionAssets: [] }),
      clearNewBadges: () =>
        set((s) => ({ assets: s.assets.map((a) => ({ ...a, isNew: false })) })),
      setAssetsPushStatus: (ids, status) => {
        const idSet = new Set(ids)
        set((s) => ({
          assets: s.assets.map((a) => idSet.has(a.id) ? { ...a, pushStatus: status } : a),
        }))
      },
      retryFailedAssets: () => {
        const failed = get().assets.filter((a) => a.pushStatus === 'failed')
        const ids = failed.map((a) => a.id)
        const idSet = new Set(ids)
        set((s) => ({
          assets: s.assets.map((a) => idSet.has(a.id) ? { ...a, pushStatus: 'pending' as PushStatus } : a),
        }))
        return failed
      },
    }),
    { name: 'rentasst-assets' }
  )
)
