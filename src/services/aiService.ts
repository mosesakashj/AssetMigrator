import Anthropic from '@anthropic-ai/sdk'
import type { AIRecognitionResult } from '../types/asset'

const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined

function getClient() {
  if (!apiKey) throw new Error('VITE_ANTHROPIC_API_KEY is not set')
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
}

export async function analyzeAssetPhoto(base64: string, mimeType = 'image/jpeg'): Promise<AIRecognitionResult> {
  const client = getClient()
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType as 'image/jpeg', data: base64 },
          },
          {
            type: 'text',
            text: `You are an asset cataloguing assistant for a rental platform. Analyze this image of a physical asset and return ONLY a JSON object with these fields (omit fields you are not confident about):
{
  "name": "concise item name e.g. Gold Solitaire Ring 18K",
  "description": "1-2 sentence description for rental listing",
  "category": "one of: Jewellery, Camping, Power Tools, Event, AV Equip., Mobility, Medical, Costumes, Other",
  "material": "primary material if visible e.g. Gold, Steel, Fabric",
  "condition": "one of: Excellent, Good, Fair, Poor",
  "suggestedPrice": "suggested daily rental price in INR as a number string e.g. 350"
}
Return ONLY the JSON object, no other text.`,
          },
        ],
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) return JSON.parse(jsonMatch[0]) as AIRecognitionResult
  } catch {
    // ignore parse errors
  }
  return {}
}

export async function parseVoiceTranscript(transcript: string): Promise<{ name?: string; price?: string; priceUnit?: string }> {
  // Fast regex fallback first
  const priceMatch = transcript.match(/(\d+)\s*(?:rupees?|rs\.?|₹)?\s*(?:per\s+)?(day|hour|flat)/i)
  const nameGuess = transcript.replace(/\d+.*$/i, '').trim()

  if (!apiKey) {
    return {
      name: nameGuess || undefined,
      price: priceMatch?.[1],
      priceUnit: priceMatch?.[2] ? (priceMatch[2].toLowerCase() === 'hour' ? 'Per Hour' : 'Per Day') : undefined,
    }
  }

  try {
    const client = getClient()
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 128,
      messages: [
        {
          role: 'user',
          content: `Extract asset details from this voice transcript and return ONLY JSON:
"${transcript}"
Return: {"name": "...", "price": "number only", "priceUnit": "Per Day|Per Hour|Flat"}
Omit fields not mentioned. Return ONLY the JSON.`,
        },
      ],
    })
    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) return JSON.parse(jsonMatch[0])
  } catch {
    // fall through to regex result
  }

  return {
    name: nameGuess || undefined,
    price: priceMatch?.[1],
    priceUnit: priceMatch?.[2] ? (priceMatch[2].toLowerCase() === 'hour' ? 'Per Hour' : 'Per Day') : undefined,
  }
}
