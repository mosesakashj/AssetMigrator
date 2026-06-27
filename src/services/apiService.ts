import type { SavedAsset } from '../types/asset'

export interface PushResult {
  jobId: string
  count: number
  message: string
}

export async function mockApiPush(assets: SavedAsset[]): Promise<PushResult> {
  // Simulate network latency for demo realism
  await new Promise((r) => setTimeout(r, 1800))

  const jobId = 'JOB-' + Date.now().toString(36).toUpperCase()
  return {
    jobId,
    count: assets.length,
    message: `Import job ${jobId} queued — ${assets.length} asset${assets.length !== 1 ? 's' : ''} will appear in your dashboard within 2 minutes.`,
  }
}
