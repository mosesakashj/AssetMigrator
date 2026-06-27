import type { SavedAsset } from '../types/asset'

export interface PushResult {
  jobId: string
  count: number
  message: string
  failedIds?: string[]
}

export async function mockApiPush(assets: SavedAsset[]): Promise<PushResult> {
  await new Promise((r) => setTimeout(r, 1800))

  // Simulate 30% total failure for demo testing
  if (Math.random() < 0.3) {
    throw new Error('Network error: upstream timeout')
  }

  // Simulate ~20% per-asset partial failure
  const failedIds = assets.filter(() => Math.random() < 0.2).map((a) => a.id)

  const jobId = 'JOB-' + Date.now().toString(36).toUpperCase()
  const succeeded = assets.length - failedIds.length
  return {
    jobId,
    count: succeeded,
    message: `Import job ${jobId} queued — ${succeeded} asset${succeeded !== 1 ? 's' : ''} will appear in your dashboard within 2 minutes.`,
    failedIds,
  }
}
