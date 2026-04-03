"use client"

import Link from "next/link"
import { Navigation, Star, Clock, TrendingDown, Crosshair, Medal } from "lucide-react"
import type { Estacion, FuelType } from "@/lib/types"
import type { BadgeType } from "@/lib/scoring"
import { formatPrice, formatDistance } from "@/lib/format"
import { getBrandColor, getBrandInitials } from "@/lib/brands"
import { cn } from "@/lib/utils"
import { FavouriteButton } from "@/components/favourite-button"

interface StationCardProps {
  station: Estacion
  fuelType?: FuelType
  badge?: BadgeType | null
  ahorroEstimado?: number | null
  className?: string
  mejorOpcionRank?: number
  mejorPrecioRank?: number
  masCercanaRank?: number
}

const BADGE_CONFIG: Record<BadgeType, { label: string; className: string; icon: React.ReactNode }> = {
  mejor_opcion: {
    label: "Mejor opción",
    className: "text-amber-700 bg-amber-50 border-amber-200",
    icon: <Star className="h-2.5 w-2.5" />,
  },
  mejor_precio: {
    label: "Mejor precio",
    className: "text-emerald-700 bg-emerald-50 border-emerald-200",
    icon: <TrendingDown className="h-2.5 w-2.5" />,
  },
  mas_cercana: {
    label: "Más cercana",
    className: "text-blue-700 bg-blue-50 border-blue-200",
    icon: <Crosshair className="h-2.5 w-2.5" />,
  },
  abierto_24h: {
    label: "Abierto 24h",
    className: "text-slate-700 bg-slate-50 border-slate-200",
    icon: <Clock className="h-2.5 w-2.5" />,
  },
}

const BAR_COLOR: Record<BadgeType, string> = {
  mejor_opcion: "bg-amber-400",
  mejor_precio: "bg-emerald-500",
  mas_cercana: "bg-blue-400",
  abierto_24h: "bg-slate-300",
}

function getMejorOpcionRankStyle(rank: number): { border: string; shadow: string; pulse: boolean } {
  if (rank === 1) return {
    border: "border-yellow-400",
    shadow: "shadow-[0_0_14px_rgba(234,179,8,0.55)]",
    pulse: true,
  }
  if (rank === 2) return {
    border: "border-slate-400",
    shadow: "shadow-[0_0_12px_rgba(148,163,184,0.55)]",
    pulse: true,
  }
  return {
    border: "border-amber-700/60",
    shadow: "shadow-[0_0_10px_rgba(180,120,60,0.4)]",
    pulse: true,
  }
}

function getMejorOpcionBadgeLabel(rank: number): string {
  if (rank === 1) return "Mejor opción"
  return `Top ${rank}`
}

function getMejorOpcionBadgeClass(rank: number): string {
  if (rank === 1) return "text-yellow-700 bg-yellow-50 border-yellow-300"
  if (rank === 2) return "text-slate-600 bg-slate-50 border-slate-300"
  return "text-amber-800 bg-amber-50/60 border-amber-300/70"
}

export function StationCard({
  station,
  fuelType = "gasolina95",
  badge,
  ahorroEstimado,
  className,
  mejorOpcionRank,
  mejorPrecioRank,
  masCercanaRank,
}: StationCardProps) {
  const price = getPriceForFuel(station, fuelType)
  const color = getBrandColor(station.rotulo)
  const initials = getBrandInitials(station.rotulo)
  const barColor = badge ? BAR_COLOR[badge] : "bg-zinc-200"
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.latitud},${station.longitud}`

  const rankStyle = mejorOpcionRank !== undefined ? getMejorOpcionRankStyle(mejorOpcionRank) : null

  const priceColor = badge === "mejor_opcion" || mejorOpcionRank !== undefined ? "text-amber-700"
    : badge === "mejor_precio" || mejorPrecioRank !== undefined ? "text-emerald-700"
    : badge === "mas_cercana" || masCercanaRank !== undefined ? "text-blue-700"
    : price !== undefined ? "text-slate-800"
    : "text-zinc-400"

  const badgeContent = mejorOpcionRank !== undefined ? (
    <span className={cn(
      "flex-shrink-0 flex items-center gap-1 text-[10px] font-bold border px-1.5 py-0.5 rounded",
      getMejorOpcionBadgeClass(mejorOpcionRank)
    )}>
      {mejorOpcionRank === 1 ? <Star className="h-2.5 w-2.5" /> : <Medal className="h-2.5 w-2.5" />}
      {getMejorOpcionBadgeLabel(mejorOpcionRank)}
    </span>
  ) : mejorPrecioRank !== undefined ? (
    <span className={cn(
      "flex-shrink-0 flex items-center gap-1 text-[10px] font-bold border px-1.5 py-0.5 rounded",
      mejorPrecioRank === 1 ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-emerald-600 bg-emerald-50/60 border-emerald-200/70"
    )}>
      <TrendingDown className="h-2.5 w-2.5" />
      {mejorPrecioRank === 1 ? "Mejor precio" : `Top ${mejorPrecioRank}`}
    </span>
  ) : masCercanaRank !== undefined ? (
    <span className={cn(
      "flex-shrink-0 flex items-center gap-1 text-[10px] font-bold border px-1.5 py-0.5 rounded",
      masCercanaRank === 1 ? "text-blue-700 bg-blue-50 border-blue-200" : "text-blue-600 bg-blue-50/60 border-blue-200/70"
    )}>
      <Crosshair className="h-2.5 w-2.5" />
      {masCercanaRank === 1 ? "Más cercana" : `Top ${masCercanaRank}`}
    </span>
  ) : badge ? (
    <span className={cn(
      "flex-shrink-0 flex items-center gap-1 text-[10px] font-bold border px-1.5 py-0.5 rounded",
      BADGE_CONFIG[badge].className
    )}>
      {BADGE_CONFIG[badge].icon}
      {BADGE_CONFIG[badge].label}
    </span>
  ) : null

  return (
    <div className={cn(
      "w-full group relative bg-white rounded-xl border overflow-hidden transition-all duration-150",
      rankStyle
        ? cn(
            rankStyle.border,
            rankStyle.shadow,
            rankStyle.pulse && "animate-[rankPulse_2.5s_ease-in-out_infinite]",
            "hover:shadow-none hover:border-emerald-300"
          )
        : "border-zinc-200 hover:border-emerald-300 hover:shadow-md active:scale-[0.995]",
      className
    )}>
      <div className={cn("absolute left-0 top-0 bottom-0 w-1", barColor)} />

      <Link href={`/estacion/${station.id}`} className="block pl-3 pr-4 pt-3.5 pb-3">
        <div className="flex items-start gap-3">
          <div
            className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm mt-0.5"
            style={{ backgroundColor: color }}
          >
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-1.5 flex-wrap">
              <p className="font-bold text-slate-900 text-sm leading-tight">{station.rotulo}</p>
              {badgeContent}
            </div>
            <p className="text-xs text-zinc-500 truncate mt-0.5 leading-snug">
              {station.direccion}, {station.localidad}
            </p>
            {station.distancia !== undefined && (
              <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
                <Navigation className="h-3 w-3 flex-shrink-0" />
                {formatDistance(station.distancia)}
              </p>
            )}
          </div>

          <div className="flex-shrink-0 text-right min-w-[60px] max-w-[80px]">
            <div className={cn("text-xl font-black tabular-nums leading-none", priceColor)}>
              {formatPrice(price)}
            </div>
            <div className="text-[10px] text-zinc-400 mt-0.5">€/litro</div>
            {ahorroEstimado !== undefined && ahorroEstimado !== null && ahorroEstimado > 0 && (
              <div className="text-[10px] font-semibold text-emerald-600 mt-0.5 whitespace-nowrap">
                Ahorras {ahorroEstimado.toFixed(2)}€
              </div>
            )}
          </div>
        </div>
      </Link>

      <div className="mx-3 mb-3 flex gap-2">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-center gap-1.5 flex-1 py-2 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-emerald-50 hover:border-emerald-300 text-xs font-semibold text-zinc-600 hover:text-emerald-700 transition-colors duration-150"
        >
          <Navigation className="h-3.5 w-3.5" />
          Cómo llegar
        </a>
        <FavouriteButton stationId={station.id} size="sm" />
      </div>
    </div>
  )
}

function getPriceForFuel(station: Estacion, fuel: FuelType): number | undefined {
  const map: Record<FuelType, number | undefined> = {
    gasolina95: station.precioGasolina95,
    gasolina98: station.precioGasolina98,
    diesel: station.precioDiesel,
    dieselPremium: station.precioDieselPremium,
    glp: station.precioGLP,
    electric: undefined,
  }
  return map[fuel]
}
