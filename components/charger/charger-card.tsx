"use client"

import Link from "next/link"
import { Navigation, Zap, CircleCheck as CheckCircle2, CircleAlert as AlertCircle, CircleHelp as HelpCircle } from "lucide-react"
import type { Charger, ChargerStatus, PlugType, SpeedTier } from "@/lib/types"
import { cn } from "@/lib/utils"
import {
  formatChargerPrice,
  PLUG_TYPE_LABELS,
  SPEED_TIER_LABELS,
  getMaxPowerKw,
  getUniquePlugTypes,
  getTotalPoints,
} from "@/lib/charger-utils"
import { formatDistance } from "@/lib/format"

interface ChargerCardProps {
  charger: Charger
  className?: string
}

const STATUS_CONFIG: Record<ChargerStatus, { label: string; icon: React.ReactNode; barClass: string; textClass: string }> = {
  operational: {
    label: "Operativo",
    icon: <CheckCircle2 className="h-3 w-3" />,
    barClass: "bg-green-500",
    textClass: "text-green-600",
  },
  unavailable: {
    label: "No disponible",
    icon: <AlertCircle className="h-3 w-3" />,
    barClass: "bg-slate-300",
    textClass: "text-slate-400",
  },
  unknown: {
    label: "Estado desconocido",
    icon: <HelpCircle className="h-3 w-3" />,
    barClass: "bg-amber-400",
    textClass: "text-amber-500",
  },
  planned: {
    label: "Planificado",
    icon: <HelpCircle className="h-3 w-3" />,
    barClass: "bg-blue-400",
    textClass: "text-blue-500",
  },
  removed: {
    label: "Retirado",
    icon: <AlertCircle className="h-3 w-3" />,
    barClass: "bg-red-300",
    textClass: "text-red-400",
  },
}

const PLUG_SHORT: Record<PlugType, string> = {
  type2: "T2",
  ccs: "CCS",
  chademo: "CHAdeMO",
  schuko: "T1",
  tesla: "Tesla",
  nacs: "NACS",
  other: "?",
}

const SPEED_COLORS: Record<SpeedTier, string> = {
  slow: "bg-slate-100 text-slate-600 border-slate-200",
  fast: "bg-blue-50 text-blue-700 border-blue-200",
  rapid: "bg-amber-50 text-amber-700 border-amber-200",
  ultra_rapid: "bg-orange-50 text-orange-700 border-orange-200",
}

export function ChargerCard({ charger, className }: ChargerCardProps) {
  const statusCfg = STATUS_CONFIG[charger.status] ?? STATUS_CONFIG.unknown
  const connectors = charger.connectors ?? []
  const maxPower = getMaxPowerKw(connectors)
  const plugTypes = getUniquePlugTypes(connectors)
  const totalPoints = getTotalPoints(connectors)
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${charger.lat},${charger.lng}`

  const topSpeedTier = connectors.reduce<SpeedTier | null>((best, c) => {
    const order: SpeedTier[] = ["slow", "fast", "rapid", "ultra_rapid"]
    if (!best) return c.speed_tier
    return order.indexOf(c.speed_tier) > order.indexOf(best) ? c.speed_tier : best
  }, null)

  return (
    <div
      className={cn(
        "w-full group relative bg-white rounded-xl border border-zinc-200 overflow-hidden",
        "hover:border-amber-300 hover:shadow-md transition-all duration-150",
        charger.status === "unavailable" && "opacity-60",
        className
      )}
    >
      <div className={cn("absolute left-0 top-0 bottom-0 w-1", statusCfg.barClass)} />

      <Link href={`/cargador/${charger.id}`} className="block pl-3 pr-4 pt-3.5 pb-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-400 flex items-center justify-center shadow-sm mt-0.5">
            <Zap className="h-5 w-5 text-slate-900" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-1.5 flex-wrap">
              <p className="font-bold text-slate-900 text-sm leading-tight truncate">{charger.name || charger.operator_name || "Cargador EV"}</p>
            </div>
            {charger.operator_name && charger.name !== charger.operator_name && (
              <p className="text-xs text-zinc-500 truncate leading-snug">{charger.operator_name}</p>
            )}
            <p className="text-xs text-zinc-500 truncate mt-0.5 leading-snug">
              {charger.address}, {charger.city}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn("flex items-center gap-1 text-[10px] font-semibold", statusCfg.textClass)}>
                {statusCfg.icon}
                {statusCfg.label}
              </span>
              {charger.distancia !== undefined && (
                <span className="text-xs text-zinc-400 flex items-center gap-1">
                  <Navigation className="h-3 w-3 flex-shrink-0" />
                  {formatDistance(charger.distancia)}
                </span>
              )}
            </div>
          </div>

          <div className="flex-shrink-0 text-right min-w-[68px]">
            <div className="text-sm font-black text-slate-800 leading-tight">
              {formatChargerPrice(charger)}
            </div>
            {maxPower && (
              <div className="text-[10px] text-zinc-400 mt-0.5">{maxPower} kW máx.</div>
            )}
            {totalPoints > 0 && (
              <div className="text-[10px] text-zinc-400 mt-0.5">{totalPoints} {totalPoints === 1 ? "punto" : "puntos"}</div>
            )}
          </div>
        </div>

        {(plugTypes.length > 0 || topSpeedTier) && (
          <div className="flex flex-wrap gap-1 mt-2 ml-13">
            {plugTypes.map((pt) => (
              <span
                key={pt}
                className="text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded"
              >
                {PLUG_SHORT[pt]}
              </span>
            ))}
            {topSpeedTier && (
              <span
                className={cn("text-[10px] font-semibold border px-1.5 py-0.5 rounded", SPEED_COLORS[topSpeedTier])}
              >
                {SPEED_TIER_LABELS[topSpeedTier].split(" ")[0]}
              </span>
            )}
          </div>
        )}
      </Link>

      <div className="mx-3 mb-3 flex gap-2">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-center gap-1.5 flex-1 py-2 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-amber-50 hover:border-amber-300 text-xs font-semibold text-zinc-600 hover:text-amber-700 transition-colors duration-150"
        >
          <Navigation className="h-3.5 w-3.5" />
          Cómo llegar
        </a>
        {charger.ocm_url && (
          <a
            href={charger.ocm_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-amber-50 hover:border-amber-300 text-xs font-semibold text-zinc-600 hover:text-amber-700 transition-colors duration-150"
          >
            <Zap className="h-3.5 w-3.5" />
            OCM
          </a>
        )}
      </div>
    </div>
  )
}
