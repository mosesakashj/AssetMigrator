import type { PriceUnit } from '../../types/asset'

const UNITS: PriceUnit[] = ['Per Day', 'Per Hour', 'Flat']

interface PriceInputProps {
  price: string
  unit: PriceUnit
  onPriceChange: (v: string) => void
  onUnitChange: (u: PriceUnit) => void
  autofilled?: boolean
}

export function PriceInput({ price, unit, onPriceChange, onUnitChange, autofilled }: PriceInputProps) {
  return (
    <div>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-neutral-400">₹</span>
        <input
          type="number"
          inputMode="decimal"
          value={price}
          onChange={(e) => onPriceChange(e.target.value)}
          placeholder="0"
          className={`w-full pl-7 pr-3 py-3 border-[1.5px] rounded-md text-sm font-medium outline-none transition-colors ${
            autofilled
              ? 'border-green-300 bg-success-50 text-neutral-900'
              : 'border-neutral-200 bg-white text-neutral-900 focus:border-primary-600 focus:shadow-[0_0_0_3px_rgba(194,26,127,0.08)]'
          }`}
        />
      </div>
      <div className="flex bg-neutral-100 rounded-[10px] p-1 gap-0.5 mt-2">
        {UNITS.map((u) => (
          <button
            key={u}
            type="button"
            onClick={() => onUnitChange(u)}
            className={`flex-1 py-1.5 rounded-[8px] text-xs font-bold transition-all ${
              unit === u ? 'bg-primary-600 text-white' : 'text-neutral-500'
            }`}
          >
            {u}
          </button>
        ))}
      </div>
    </div>
  )
}
