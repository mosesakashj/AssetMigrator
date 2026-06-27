export type PriceUnit = 'Per Day' | 'Per Hour' | 'Flat'

export type AssetCategory =
  | 'Choker'
  | 'Necklace'

export interface VariantAttribute {
  name: string
  values: string[]
}

export interface VariantCombo {
  name: string
  price: string
  qty: string
}

export interface AssetFields {
  name: string
  description: string
  category: AssetCategory | string
  brand: string
  model: string
  material: string
  condition: string
  price: string
  qty: string
  priceUnit: PriceUnit
  imageBase64: string | null
  variantAttributes: VariantAttribute[]
  variantCombos: VariantCombo[]
}

export interface SavedAsset extends AssetFields {
  id: string
  branch: string
  sessionId: string
  createdAt: number
  isNew?: boolean
}

export interface SessionClassify {
  category: AssetCategory | string
  categoryIcon: string
  brand: string
  model: string
  branch: string
}

export interface AIRecognitionResult {
  name?: string
  description?: string
  category?: string
  material?: string
  condition?: string
  suggestedPrice?: string
}

export const CATEGORIES: { label: AssetCategory | string; icon: string }[] = [
  { label: 'Choker', icon: '📿' },
  { label: 'Necklace', icon: '💎' },
]

export const BRANDS = [
  'Coleman',
  'Bosch',
  'Quechua',
  'Tanishq',
  'Kalyan Jewellers',
  'Yamaha',
  'Sony',
  'Canon',
  'Generic / Unbranded',
]

export const BRANCHES = [
  'Bangalore HQ',
  'Whitefield',
]

export const MOCK_BARCODE_DB: Record<string, Partial<AssetFields>> = {
  '8901030123456': { name: 'Bosch GSB 13 RE Drill Machine', brand: 'Bosch', category: 'Power Tools', price: '220' },
  '4901234567890': { name: 'Coleman 4-Person Dome Tent', brand: 'Coleman', category: 'Camping', price: '350' },
  '1234567890128': { name: 'Canon EOS 200D Camera', brand: 'Canon', category: 'AV Equip.', price: '800' },
  '9876543210123': { name: 'Sony MDR-XB550AP Headphones', brand: 'Sony', category: 'AV Equip.', price: '150' },
  '5901234123457': { name: 'Gold Solitaire Ring 18K', brand: 'Tanishq', category: 'Jewellery', price: '500' },
}
