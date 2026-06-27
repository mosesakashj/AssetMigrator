import { create } from 'zustand'
import type { SessionClassify } from '../types/asset'

interface SessionState {
  classify: SessionClassify
  sessionId: string
  setClassify: (c: SessionClassify) => void
  newSession: () => void
}

function makeSessionId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export const useSessionStore = create<SessionState>((set) => ({
  classify: {
    category: 'Jewellery',
    categoryIcon: '💍',
    brand: '',
    model: '',
    branch: 'Bangalore HQ',
    priceUnit: 'Per Day',
  },
  sessionId: makeSessionId(),
  setClassify: (c) => set({ classify: c }),
  newSession: () => set({ sessionId: makeSessionId() }),
}))
