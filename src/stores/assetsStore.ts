import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SavedAsset } from '../types/asset'

interface AssetsState {
  assets: SavedAsset[]
  sessionAssets: SavedAsset[]
  addSessionAsset: (asset: SavedAsset) => void
  commitSession: () => void
  clearSessionAssets: () => void
  clearNewBadges: () => void
}

export const useAssetsStore = create<AssetsState>()(
  persist(
    (set) => ({
      assets: [],
      sessionAssets: [],
      addSessionAsset: (asset) =>
        set((s) => ({ sessionAssets: [...s.sessionAssets, asset] })),
      commitSession: () =>
        set((s) => ({
          assets: [...s.sessionAssets.map((a) => ({ ...a, isNew: true })), ...s.assets],
          sessionAssets: [],
        })),
      clearSessionAssets: () => set({ sessionAssets: [] }),
      clearNewBadges: () =>
        set((s) => ({ assets: s.assets.map((a) => ({ ...a, isNew: false })) })),
    }),
    { name: 'rentasst-assets' }
  )
)
