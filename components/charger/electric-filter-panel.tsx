"use client"

import { CircleCheck as CheckCircle2, CircleAlert as AlertCircle, CircleHelp as HelpCircle, Zap, Info } from "lucide-react"
import type { Charger, ChargerFilters, ChargerStatus, PlugType, SpeedTier } from "@/lib/types"
import { PLUG_TYPE_LABELS, SPEED_TIER_LABELS } from "@/lib/charger-utils"
import { cn } from "@/lib/utils"

interface ElectricFilterPanelProps {
  chargers: Charger[]
  filters: ChargerFilters
  onFiltersChange: (filters: ChargerFilters) => void
}

const ALL_STATUSES: ChargerStatus[] = ["operational", "unavailable", "unknown"]
const ALL_PLUGS: PlugType[] = ["type2", "ccs", "chademo", "schuko", "tesla", "nacs"]
const ALL_SPEEDS: SpeedTier[] = ["slow", "fast", "rapid", "ultra_rapid"]

const STATUS_CFG: Record<ChargerStatus, { label: string; icon: React.ReactNode; dotClass: string }> = {
  operational: { label: "Operativo", icon: <CheckCircle2 className="h-3.5 w-3.5" />, dotClass: "bg-green-500" },
  unavailable: { label: "No disponible", icon: <AlertCircle className="h-3.5 w-3.5" />, dotClass: "bg-slate-300" },
  unknown: { label: "Desconocido", icon: <HelpCircle className="h-3.5 w-3.5" />, dotClass: "bg-amber-400" },
  planned: { label: "Planificado", icon: <HelpCircle className="h-3.5 w-3.5" />, dotClass: "bg-blue-400" },
  removed: { label: "Retirado", icon: <AlertCircle className="h-3.5 w-3.5" />, dotClass: "bg-red-300" },
}

const SPEED_CFG: Record<SpeedTier, { label: string; color: string; kw: string }> = {
  slow: { label: "Lenta", color: "text-slate-600", kw: "≤7 kW" },
  fast: { label: "Rápida", color: "text-blue-600", kw: "7–22 kW" },
  rapid: { label: "Súper-rápida", color: "text-amber-600", kw: "22–50 kW" },
  ultra_rapid: { label: "Ultra-rápida", color: "text-orange-600", kw: "50+ kW" },
}

function countByStatus(chargers: Charger[], status: ChargerStatus) {
  return chargers.filter((c) => c.status === status).length
}

function countByPlug(chargers: Charger[], plug: PlugType) {
  return chargers.filter((c) => c.connectors?.some((conn) => conn.plug_type === plug)).length
}

function countBySpeed(chargers: Charger[], speed: SpeedTier) {
  return chargers.filter((c) => c.connectors?.some((conn) => conn.speed_tier === speed)).length
}

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]
}

export function ElectricFilterPanel({ chargers, filters, onFiltersChange }: ElectricFilterPanelProps) {
  function toggleStatus(s: ChargerStatus) {
    onFiltersChange({ ...filters, status: toggle(filters.status, s) })
  }

  function togglePlug(p: PlugType) {
    onFiltersChange({ ...filters, plugTypes: toggle(filters.plugTypes, p) })
  }

  function toggleSpeed(s: SpeedTier) {
    onFiltersChange({ ...filters, speedTiers: toggle(filters.speedTiers, s) })
  }

  function setPricing(p: ChargerFilters["pricingType"]) {
    onFiltersChange({ ...filters, pricingType: p })
  }

  const activeCount =
    filters.status.length +
    filters.plugTypes.length +
    filters.speedTiers.length +
    (filters.pricingType !== "all" ? 1 : 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filtros</h3>
        {activeCount > 0 && (
          <button
            onClick={() => onFiltersChange({ status: [], plugTypes: [], speedTiers: [], pricingType: "all" })}
            className="text-[11px] text-amber-600 hover:text-amber-700 font-semibold"
          >
            Limpiar ({activeCount})
          </button>
        )}
      </div>

      <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Estado</p>
        <div className="space-y-1">
          {ALL_STATUSES.map((s) => {
            const cfg = STATUS_CFG[s]
            const count = countByStatus(chargers, s)
            const active = filters.status.includes(s)
            return (
              <button
                key={s}
                onClick={() => toggleStatus(s)}
                className={cn(
                  "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-all",
                  active
                    ? "bg-amber-50 border border-amber-200 text-amber-800 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 border border-transparent"
                )}
              >
                <span className={cn("w-2 h-2 rounded-full flex-shrink-0", cfg.dotClass)} />
                <span className="flex-1 text-left text-xs">{cfg.label}</span>
                <span className="text-[11px] text-zinc-400">{count}</span>
              </button>
            )
          })}
        </div>
        <div className="flex items-start gap-1 mt-2 px-2">
          <Info className="h-3 w-3 text-zinc-400 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-zinc-400 leading-snug">
            Estado reportado por la comunidad, no en tiempo real.
          </p>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Tipo de enchufe</p>
        <div className="space-y-1">
          {ALL_PLUGS.map((p) => {
            const count = countByPlug(chargers, p)
            if (count === 0) return null
            const active = filters.plugTypes.includes(p)
            return (
              <button
                key={p}
                onClick={() => togglePlug(p)}
                className={cn(
                  "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-all",
                  active
                    ? "bg-amber-50 border border-amber-200 text-amber-800 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 border border-transparent"
                )}
              >
                <Zap className="h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
                <span className="flex-1 text-left text-xs">{PLUG_TYPE_LABELS[p]}</span>
                <span className="text-[11px] text-zinc-400">{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Velocidad de carga</p>
        <div className="space-y-1">
          {ALL_SPEEDS.map((s) => {
            const count = countBySpeed(chargers, s)
            if (count === 0) return null
            const cfg = SPEED_CFG[s]
            const active = filters.speedTiers.includes(s)
            return (
              <button
                key={s}
                onClick={() => toggleSpeed(s)}
                className={cn(
                  "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-all",
                  active
                    ? "bg-amber-50 border border-amber-200 text-amber-800 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 border border-transparent"
                )}
              >
                <span className="flex-1 text-left">
                  <span className={cn("text-xs font-semibold", active ? "text-amber-800" : cfg.color)}>{cfg.label}</span>
                  <span className="text-[10px] text-zinc-400 ml-1">AC</span>
                  {(s === "rapid" || s === "ultra_rapid") && (
                    <span className="text-[10px] text-zinc-400 ml-1">DC</span>
                  )}
                  <span className="text-[10px] text-zinc-400 ml-1">({cfg.kw})</span>
                </span>
                <span className="text-[11px] text-zinc-400">{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Precio</p>
        <div className="flex gap-1">
          {(["all", "free", "paid"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPricing(p)}
              className={cn(
                "flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                filters.pricingType === p
                  ? "bg-amber-400 border-amber-400 text-slate-900"
                  : "border-zinc-200 text-slate-600 hover:border-amber-300 hover:text-amber-700"
              )}
            >
              {p === "all" ? "Todos" : p === "free" ? "Gratis" : "De pago"}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
