import { X } from 'lucide-react'
import type { VariantAttribute, VariantCombo } from '../../types/asset'

const PRESET_ATTRS = ['Size', 'Color', 'Capacity', 'Material', 'Weight']

interface Props {
  attributes: VariantAttribute[]
  combos: VariantCombo[]
  onAttributesChange: (attrs: VariantAttribute[]) => void
  onCombosChange: (combos: VariantCombo[]) => void
}

function cartesian(arrays: string[][]): string[][] {
  return arrays.reduce<string[][]>(
    (acc, curr) => acc.flatMap((a) => curr.map((c) => [...a, c])),
    [[]]
  )
}

function rebuildCombos(attrs: VariantAttribute[], existing: VariantCombo[]): VariantCombo[] {
  const filled = attrs.filter((a) => a.values.length > 0)
  if (!filled.length) return []
  const names = cartesian(filled.map((a) => a.values)).map((c) => c.join(' / '))
  return names.map((n) => {
    const prev = existing.find((e) => e.name === n)
    return prev ?? { name: n, price: '', qty: '' }
  })
}

export function VariantBuilder({ attributes, combos, onAttributesChange, onCombosChange }: Props) {
  function toggleAttr(name: string) {
    const exists = attributes.find((a) => a.name === name)
    let next: VariantAttribute[]
    if (exists) {
      next = attributes.filter((a) => a.name !== name)
    } else {
      next = [...attributes, { name, values: [] }]
    }
    onAttributesChange(next)
    onCombosChange(rebuildCombos(next, combos))
  }

  function setValues(name: string, raw: string) {
    const values = raw.split(',').map((v) => v.trim()).filter(Boolean)
    const next = attributes.map((a) => a.name === name ? { ...a, values } : a)
    onAttributesChange(next)
    onCombosChange(rebuildCombos(next, combos))
  }

  function updateCombo(i: number, field: 'price' | 'qty', val: string) {
    const next = [...combos]
    next[i] = { ...next[i], [field]: val }
    onCombosChange(next)
  }

  return (
    <div className="bg-white border-[1.5px] border-neutral-200 rounded-2xl overflow-hidden mb-3">
      {/* Header + chips */}
      <div className="px-4 pt-3.5 pb-3">
        <p className="text-[11px] font-extrabold text-neutral-400 uppercase tracking-wide mb-2.5">Variants</p>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_ATTRS.map((name) => {
            const active = !!attributes.find((a) => a.name === name)
            return (
              <button
                key={name}
                type="button"
                onClick={() => toggleAttr(name)}
                className={`px-3 py-1.5 rounded-full border-[1.5px] text-xs font-bold transition-all ${
                  active
                    ? 'bg-primary-600 border-primary-600 text-white'
                    : 'border-neutral-200 bg-neutral-50 text-neutral-500'
                }`}
              >
                {active ? '✓ ' : '+ '}{name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Attribute value rows */}
      {attributes.length > 0 && (
        <div className="border-t border-neutral-100 divide-y divide-neutral-100">
          {attributes.map((attr) => (
            <div key={attr.name} className="flex items-center gap-2.5 px-4 py-2.5">
              <span className="w-[68px] flex-shrink-0 text-[11px] font-extrabold text-neutral-600">{attr.name}</span>
              <input
                value={attr.values.join(', ')}
                onChange={(e) => setValues(attr.name, e.target.value)}
                placeholder={attr.name === 'Size' ? 'S, M, L, XL' : attr.name === 'Color' ? 'Red, Blue, Black' : 'comma separated'}
                className="flex-1 text-xs font-medium text-neutral-900 placeholder:text-neutral-300 bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-2 outline-none focus:border-primary-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => toggleAttr(attr.name)}
                className="text-neutral-300 hover:text-error-400 transition-colors flex-shrink-0"
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Combos */}
      {combos.length > 0 && (
        <div className="border-t border-neutral-100 px-4 py-3">
          <p className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wide mb-2">
            {combos.length} combination{combos.length !== 1 ? 's' : ''} — set price &amp; qty
          </p>
          <div className="flex flex-col gap-1.5">
            {combos.map((c, i) => (
              <div key={c.name} className="flex items-center gap-2 bg-neutral-50 border border-neutral-100 rounded-xl px-3 py-2">
                <span className="flex-1 text-xs font-bold text-neutral-700 truncate">{c.name}</span>
                <span className="text-[11px] font-bold text-neutral-400">₹</span>
                <input
                  value={c.price}
                  onChange={(e) => updateCombo(i, 'price', e.target.value)}
                  placeholder="Price"
                  className="w-14 text-center text-xs font-bold bg-white border border-neutral-200 rounded-lg px-1.5 py-1.5 outline-none focus:border-primary-500"
                />
                <input
                  value={c.qty}
                  onChange={(e) => updateCombo(i, 'qty', e.target.value)}
                  placeholder="Qty"
                  className="w-10 text-center text-xs font-bold bg-white border border-neutral-200 rounded-lg px-1 py-1.5 outline-none focus:border-primary-500"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
