"use client"

import { useState } from "react"
import { TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface PriceSnapshot {
  snapshot_date: string
  precio_gasolina_95: number | null
  precio_gasolina_98: number | null
  precio_diesel: number | null
  precio_diesel_premium: number | null
  precio_glp: number | null
}

interface PriceChartProps {
  snapshots: PriceSnapshot[]
}

const FUEL_LINES: {
  key: keyof Omit<PriceSnapshot, "snapshot_date">
  label: string
  color: string
  dot: string
}[] = [
  { key: "precio_gasolina_95", label: "G95", color: "#10b981", dot: "bg-emerald-500" },
  { key: "precio_gasolina_98", label: "G98", color: "#3b82f6", dot: "bg-blue-500" },
  { key: "precio_diesel", label: "Diésel", color: "#f59e0b", dot: "bg-amber-500" },
  { key: "precio_diesel_premium", label: "D. Premium", color: "#f97316", dot: "bg-orange-500" },
  { key: "precio_glp", label: "GLP", color: "#14b8a6", dot: "bg-teal-500" },
]

function SVGChart({ snapshots, activeFuels }: { snapshots: PriceSnapshot[]; activeFuels: Set<string> }) {
  const W = 600
  const H = 180
  const PAD = { top: 16, right: 16, bottom: 32, left: 44 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const allValues = FUEL_LINES.flatMap((f) =>
    activeFuels.has(f.key)
      ? snapshots.map((s) => s[f.key]).filter((v): v is number => v !== null)
      : []
  )
  if (allValues.length === 0) return null

  const minVal = Math.min(...allValues) * 0.99
  const maxVal = Math.max(...allValues) * 1.01
  const range = maxVal - minVal || 0.1

  function toX(i: number) {
    return PAD.left + (i / Math.max(snapshots.length - 1, 1)) * chartW
  }
  function toY(val: number) {
    return PAD.top + chartH - ((val - minVal) / range) * chartH
  }

  const ySteps = 4
  const yLabels = Array.from({ length: ySteps + 1 }, (_, i) => minVal + (range * i) / ySteps)

  const xLabels = snapshots
    .map((s, i) => ({ i, label: s.snapshot_date }))
    .filter((_, i) => i % Math.max(1, Math.ceil(snapshots.length / 5)) === 0 || i === snapshots.length - 1)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
      {yLabels.map((val, i) => {
        const y = toY(val)
        return (
          <g key={i}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="#f1f5f9" strokeWidth="1" />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize="9" fill="#94a3b8">
              {val.toFixed(3)}
            </text>
          </g>
        )
      })}

      {xLabels.map(({ i, label }) => {
        const x = toX(i)
        const dateStr = new Date(label).toLocaleDateString("es-ES", { day: "numeric", month: "short" })
        return (
          <text key={i} x={x} y={H - 4} textAnchor="middle" fontSize="9" fill="#94a3b8">
            {dateStr}
          </text>
        )
      })}

      {FUEL_LINES.filter((f) => activeFuels.has(f.key)).map((fuel) => {
        const points = snapshots
          .map((s, i) => {
            const val = s[fuel.key]
            if (val === null) return null
            return `${toX(i)},${toY(val)}`
          })
          .filter(Boolean)

        if (points.length < 2) return null

        const segments: string[][] = []
        let current: string[] = []
        snapshots.forEach((s, i) => {
          const val = s[fuel.key]
          if (val !== null) {
            current.push(`${toX(i)},${toY(val)}`)
          } else if (current.length > 0) {
            segments.push(current)
            current = []
          }
        })
        if (current.length > 0) segments.push(current)

        return (
          <g key={fuel.key}>
            {segments.map((seg, si) => (
              <polyline
                key={si}
                points={seg.join(" ")}
                fill="none"
                stroke={fuel.color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.9"
              />
            ))}
            {points.map((pt, pi) => {
              if (!pt) return null
              const [cx, cy] = pt.split(",").map(Number)
              return <circle key={pi} cx={cx} cy={cy} r="2.5" fill={fuel.color} />
            })}
          </g>
        )
      })}
    </svg>
  )
}

export function PriceChart({ snapshots }: PriceChartProps) {
  const availableFuels = new Set(
    FUEL_LINES.filter((f) => snapshots.some((s) => s[f.key] !== null)).map((f) => f.key)
  )

  const [activeFuels, setActiveFuels] = useState<Set<string>>(new Set(availableFuels))

  function toggleFuel(key: string) {
    setActiveFuels((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        if (next.size > 1) next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  if (snapshots.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="font-bold text-slate-900 text-lg mb-4 flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-emerald-600" />
          Evolución del precio
        </h2>
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
            <TrendingDown className="h-6 w-6 text-slate-300" />
          </div>
          <p className="text-sm font-medium text-slate-600">Sin datos históricos aún</p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
            Los precios históricos se van acumulando con el tiempo. Vuelve pronto para ver la evolución.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h2 className="font-bold text-slate-900 text-lg mb-1 flex items-center gap-2">
        <TrendingDown className="h-5 w-5 text-emerald-600" />
        Evolución del precio
      </h2>
      <p className="text-xs text-slate-400 mb-4">Últimos {snapshots.length} días</p>

      <div className="flex items-center gap-2 flex-wrap mb-4">
        {FUEL_LINES.filter((f) => availableFuels.has(f.key)).map((f) => (
          <button
            key={f.key}
            onClick={() => toggleFuel(f.key)}
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border transition-all",
              activeFuels.has(f.key)
                ? "border-transparent text-white shadow-sm"
                : "bg-white text-slate-400 border-slate-200"
            )}
            style={activeFuels.has(f.key) ? { backgroundColor: f.color } : {}}
          >
            <span className={cn("w-2 h-2 rounded-full", f.dot, !activeFuels.has(f.key) && "opacity-40")} />
            {f.label}
          </button>
        ))}
      </div>

      <div className="w-full" style={{ height: 180 }}>
        <SVGChart snapshots={snapshots} activeFuels={activeFuels} />
      </div>
    </div>
  )
}
