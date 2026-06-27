import { ArrowLeft } from 'lucide-react'

interface TopBarProps {
  title: string
  onBack?: () => void
  right?: React.ReactNode
}

export function TopBar({ title, onBack, right }: TopBarProps) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3.5 bg-white border-b border-neutral-200 flex-shrink-0">
      {onBack && (
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-sm bg-neutral-100 flex items-center justify-center text-neutral-500 flex-shrink-0"
        >
          <ArrowLeft size={16} />
        </button>
      )}
      <div className="flex-1 text-[17px] font-extrabold text-primary-600 tracking-tight">{title}</div>
      {right}
    </div>
  )
}
