import { useState } from 'react'
import { X, Plus, Zap } from 'lucide-react'
import type { VariantAttribute, VariantCombo } from '../../types/asset'

const PRESET_ATTRS = ['Size', 'Color', 'Capacity', 'Material', 'Weight']

interface VariantBuilderProps {
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

export function VariantBuilder({ attributes, combos, onAttributesChange, onCombosChange }: VariantBuilderProps) {
  const [pendingAttr, setPendingAttr] = useState<string | null>(null)
  const [inputVal, setInputVal] = useState('')
  const [bulkPrice, setBulkPrice] = useState('')
  const [bulkQty, setBulkQty] = useState('')

  function pickAttr(name: string) {
    if (attributes.find((a) => a.name === name)) return
    setPendingAttr(name)
    setInputVal('')
  }

  function addAttrValues() {
    if (!pendingAttr) return
    const vals = inputVal.split(',').map((v) => v.trim()).filter(Boolean)
    if (!vals.length) return
    onAttributesChange([...attributes, { name: pendingAttr, values: vals }])
    setPendingAttr(null)
    setInputVal('')
  }

  function removeAttr(name: string) {
    onAttributesChange(attributes.filter((a) => a.name !== name))
    onCombosChange([])
  }

  function generateCombos() {
    if (!attributes.length) return
    const names = cartesian(attributes.map((a) => a.values)).map((c) => c.join(' / '))
    onCombosChange(names.map((n) => ({ name: n, price: '', qty: '' })))
  }

  function applyBulk() {
    onCombosChange(combos.map((c) => ({
      ...c,
      price: bulkPrice || c.price,
      qty: bulkQty || c.qty,
    })))
  }

  function updateCombo(i: number, field: 'price' | 'qty', val: string) {
    const next = [...combos]
    next[i] = { ...next[i], [field]: val }
    onCombosChange(next)
  }

  return (
    <div className="mt-3">
      <div className="text-xs font-bold text-neutral-500 mb-2">Add variant types</div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {PRESET_ATTRS.map((name) => {
          const added = !!attributes.find((a) => a.name === name)
          return (
            <button
              key={name}
              type="button"
              onClick={() => pickAttr(name)}
              className={`px-3 py-1.5 rounded-full border-[1.5px] text-xs font-bold transition-all ${
                added
                  ? 'bg-primary-600 border-primary-600 text-white'
                  : 'border-neutral-200 bg-white text-neutral-500'
              }`}
            >
              + {name}
            </button>
          )
        })}
      </div>

      {pendingAttr && (
        <div className="flex gap-2 mb-2">
          <input
            autoFocus
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addAttrValues()}
            placeholder={`Values for ${pendingAttr}, comma separated`}
            className="flex-1 px-3 py-2.5 border-[1.5px] border-primary-600 rounded-md text-xs font-medium outline-none bg-white"
          />
          <button
            type="button"
            onClick={addAttrValues}
            className="px-4 rounded-md bg-primary-600 text-white text-xs font-extrabold"
          >
            Add
          </button>
        </div>
      )}

      {attributes.map((attr) => (
        <div key={attr.name} className="bg-white border border-neutral-200 rounded-md px-3 py-2.5 mb-2">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-extrabold text-neutral-800">{attr.name}</span>
            <button type="button" onClick={() => removeAttr(attr.name)} className="text-error-500 text-xs font-bold">Remove</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {attr.values.map((v) => (
              <span key={v} className="text-xs font-bold text-primary-700 bg-primary-50 border border-primary-200 rounded-full px-2.5 py-1">{v}</span>
            ))}
          </div>
        </div>
      ))}

      {attributes.length > 0 && !combos.length && (
        <button
          type="button"
          onClick={generateCombos}
          className="w-full mt-2 py-3 border-[1.5px] border-primary-600 bg-primary-50 text-primary-600 rounded-md text-sm font-extrabold flex items-center justify-center gap-2"
        >
          <Zap size={15} /> Generate Variant Combinations
        </button>
      )}

      {combos.length > 0 && (
        <div className="mt-3">
          <div className="text-[11px] font-extrabold text-neutral-400 uppercase tracking-wide mb-2">
            <span className="text-primary-600">{combos.length}</span> variant combinations
          </div>
          <div className="flex gap-2 bg-success-50 border border-green-200 rounded-md p-2.5 mb-2 items-center">
            <span className="text-xs font-bold text-neutral-400">₹</span>
            <input
              value={bulkPrice}
              onChange={(e) => setBulkPrice(e.target.value)}
              placeholder="Price for all"
              className="flex-1 px-2 py-2 border border-green-200 rounded-[9px] text-xs font-bold bg-white outline-none"
            />
            <input
              value={bulkQty}
              onChange={(e) => setBulkQty(e.target.value)}
              placeholder="Qty for all"
              className="w-20 px-2 py-2 border border-green-200 rounded-[9px] text-xs font-bold bg-white outline-none"
            />
            <button
              type="button"
              onClick={applyBulk}
              className="px-3 py-2 bg-success-600 text-white rounded-[9px] text-xs font-extrabold whitespace-nowrap"
            >
              Apply All
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            {combos.map((c, i) => (
              <div key={c.name} className="flex items-center gap-2 bg-white border border-neutral-200 rounded-md px-2.5 py-2">
                <span className="flex-1 text-xs font-bold text-neutral-800 truncate">{c.name}</span>
                <span className="text-[11px] font-bold text-neutral-400">₹</span>
                <input
                  value={c.price}
                  onChange={(e) => updateCombo(i, 'price', e.target.value)}
                  placeholder="Price"
                  className="w-16 text-center px-1.5 py-1.5 border border-neutral-200 rounded-[8px] text-xs font-bold outline-none focus:border-primary-600"
                />
                <input
                  value={c.qty}
                  onChange={(e) => updateCombo(i, 'qty', e.target.value)}
                  placeholder="Qty"
                  className="w-12 text-center px-1.5 py-1.5 border border-neutral-200 rounded-[8px] text-xs font-bold outline-none focus:border-primary-600"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
