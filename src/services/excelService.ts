import * as XLSX from 'xlsx'
import type { SavedAsset } from '../types/asset'

export function exportAssetsToExcel(assets: SavedAsset[], filename = 'RentAsst_Import.xlsx') {
  const rows = assets.map((a) => ({
    Name: a.name,
    Category: a.category,
    Brand: a.brand,
    Model: a.model,
    Description: a.description,
    Material: a.material,
    Condition: a.condition,
    Price: a.price,
    Qty: a.qty || '',
    'Price Unit': a.priceUnit,
    Branch: a.branch,
    Variants: a.variantCombos.length > 0
      ? a.variantCombos.map((v) => `${v.name}:₹${v.price || a.price}`).join(' | ')
      : '',
    'Variant Count': a.variantCombos.length || '',
  }))

  const ws = XLSX.utils.json_to_sheet(rows)

  // Column widths
  ws['!cols'] = [
    { wch: 30 }, { wch: 14 }, { wch: 18 }, { wch: 18 },
    { wch: 40 }, { wch: 14 }, { wch: 12 }, { wch: 10 },
    { wch: 8 },  { wch: 12 }, { wch: 18 }, { wch: 50 }, { wch: 14 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Assets')

  XLSX.writeFile(wb, filename)
}
