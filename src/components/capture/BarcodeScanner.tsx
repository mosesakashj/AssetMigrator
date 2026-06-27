import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { MOCK_BARCODE_DB } from '../../types/asset'
import type { AssetFields } from '../../types/asset'

interface BarcodeScannerProps {
  onMatch: (fields: Partial<AssetFields>, barcode: string) => void
  onNoMatch: (barcode: string) => void
}

export function BarcodeScanner({ onMatch, onNoMatch }: BarcodeScannerProps) {
  const divId = 'barcode-scanner-div'
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [scanning, setScanning] = useState(false)
  const [lastScan, setLastScan] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    return () => {
      scannerRef.current?.stop().catch(() => {})
    }
  }, [])

  async function startScan() {
    setError('')
    setLastScan(null)
    try {
      const scanner = new Html5Qrcode(divId)
      scannerRef.current = scanner
      setScanning(true)
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 140 } },
        (code) => {
          scanner.stop().catch(() => {})
          setScanning(false)
          setLastScan(code)
          const match = MOCK_BARCODE_DB[code]
          if (match) onMatch(match, code)
          else onNoMatch(code)
        },
        () => {}
      )
    } catch {
      setScanning(false)
      setError('Camera access denied or not available.')
    }
  }

  function stopScan() {
    scannerRef.current?.stop().catch(() => {})
    setScanning(false)
  }

  return (
    <div>
      <div
        id={divId}
        className={`relative rounded-lg overflow-hidden bg-neutral-900 ${scanning ? 'h-44' : 'h-0'}`}
      />
      {!scanning && (
        <div className="relative h-44 rounded-lg overflow-hidden bg-[#0B0B0D] flex items-center justify-center mb-3">
          {/* Corner frame */}
          <div className="relative w-36 h-36">
            {(['tl','tr','bl','br'] as const).map((pos) => (
              <div
                key={pos}
                className={`absolute w-6 h-6 border-[2.5px] border-primary-500 ${
                  pos === 'tl' ? 'top-0 left-0 rounded-tl-[8px] border-r-0 border-b-0'
                  : pos === 'tr' ? 'top-0 right-0 rounded-tr-[8px] border-l-0 border-b-0'
                  : pos === 'bl' ? 'bottom-0 left-0 rounded-bl-[8px] border-r-0 border-t-0'
                  : 'bottom-0 right-0 rounded-br-[8px] border-l-0 border-t-0'
                }`}
              />
            ))}
            <div
              className="absolute left-1 right-1 h-0.5 rounded-sm"
              style={{
                top: '50%',
                background: 'linear-gradient(90deg,transparent,#E8197D 30%,#F9BBDF,#E8197D 70%,transparent)',
                boxShadow: '0 0 8px rgba(232,25,125,0.8)',
                animation: 'miniLaser 1.5s ease-in-out infinite',
              }}
            />
          </div>
          <p className="absolute bottom-2.5 text-white text-[10.5px] font-semibold opacity-80">
            Tap to activate camera
          </p>
        </div>
      )}

      {error && (
        <p className="text-error-500 text-xs font-semibold mb-2 px-1">{error}</p>
      )}

      {lastScan && !scanning && (
        <div className="flex items-center gap-2.5 bg-success-50 border border-green-200 rounded-md px-3 py-2.5 mb-3">
          <div className="w-6 h-6 rounded-full bg-success-500 text-white flex items-center justify-center text-xs flex-shrink-0">✓</div>
          <div>
            <div className="text-xs font-extrabold text-success-600">Match found — fields filled below</div>
            <div className="text-[10px] font-semibold text-green-700">{lastScan}</div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={scanning ? stopScan : startScan}
        className="w-full py-3 rounded-md text-sm font-extrabold text-white flex items-center justify-center gap-2"
        style={{ background: 'linear-gradient(100deg,#9E1568,#C21A7F,#E8197D)', boxShadow: '0 4px 14px rgba(194,26,127,0.28)' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M3 7V4a1 1 0 0 1 1-1h3M3 17v3a1 1 0 0 0 1 1h3M21 7V4a1 1 0 0 0-1-1h-3M21 17v3a1 1 0 0 1-1 1h-3"/>
        </svg>
        {scanning ? 'Stop Scanning' : 'Tap to Scan Barcode / QR'}
      </button>
    </div>
  )
}
