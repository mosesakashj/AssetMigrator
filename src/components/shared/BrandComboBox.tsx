import { useRef, useState } from 'react'
import { BRANDS } from '../../types/asset'
import { Plus } from 'lucide-react'

interface BrandComboBoxProps {
  value: string
  onChange: (v: string) => void
}

export function BrandComboBox({ value, onChange }: BrandComboBoxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = BRANDS.filter((b) =>
    b.toLowerCase().includes(query.toLowerCase())
  )

  const isNew = query.trim().length > 0 && !BRANDS.some(
    (b) => b.toLowerCase() === query.toLowerCase()
  )

  function selectBrand(b: string) {
    onChange(b)
    setQuery(b)
    setOpen(false)
    inputRef.current?.blur()
  }

  function handleBlur() {
    setTimeout(() => setOpen(false), 150)
    if (query.trim()) onChange(query.trim())
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        placeholder="Type or search brand…"
        className="w-full px-3.5 py-3 bg-white border-[1.5px] border-neutral-200 rounded-md text-sm font-medium text-neutral-900 outline-none focus:border-primary-600 transition-colors"
      />

      {open && (filtered.length > 0 || isNew) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-[14px] shadow-md z-30 overflow-hidden">
          {filtered.map((b) => (
            <button
              key={b}
              type="button"
              onMouseDown={() => selectBrand(b)}
              className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-primary-50 hover:text-primary-700 transition-colors ${
                b === value ? 'text-primary-600 font-bold bg-primary-50' : 'text-neutral-700'
              }`}
            >
              {b}
            </button>
          ))}
          {isNew && (
            <button
              type="button"
              onMouseDown={() => selectBrand(query.trim())}
              className="w-full text-left px-4 py-2.5 text-sm font-bold text-primary-600 flex items-center gap-2 border-t border-neutral-100 hover:bg-primary-50 transition-colors"
            >
              <Plus size={14} /> Create "{query.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  )
}
