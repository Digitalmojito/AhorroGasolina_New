"use client"

import { useState, useEffect } from "react"
import { MapPin, Navigation, TrendingDown } from "lucide-react"
import { createClient } from "@/lib/supabase"
import type { FuelType } from "@/lib/types"
import { cn } from "@/lib/utils"

interface NearbyStation {
  id: string
  rotulo: string
  direccion: string
  localidad: string
  distancia?: number
  precio?: number
}

const FUEL_PRICE_COLUMNS: Record<FuelType, string> = {
  gasolina95: "precio_gasolina_95",
  gasolina98: "precio_gasolina_98",
  diesel: "precio_diesel",
  dieselPremium: "precio_diesel_premium",
  glp: "precio_glp",
  electric: "",
}

const FUEL_LABELS: Record<FuelType, string> = {
  gasolina95: "G95",
  gasolina98: "G98",
  diesel: "Diésel",
  dieselPremium: "D+",
  glp: "GLP",
  electric: "EV",
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

interface NearbyStationsWidgetProps {
  postcode: string
  location: string
  fuelType: FuelType
}

export function NearbyStationsWidget({ postcode, location, fuelType }: NearbyStationsWidgetProps) {
  const [stations, setStations] = useState<NearbyStation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const priceCol = FUEL_PRICE_COLUMNS[fuelType]
  const canShow = fuelType !== "electric" && !!priceCol

  useEffect(() => {
    if (!canShow) {
      setLoading(false)
      return
    }

    async function loadStations() {
      setLoading(true)
      setError(false)

      try {
        const supabase = createClient()

        let centroidLat: number | null = null
        let centroidLng: number | null = null

        if (postcode) {
          const { data: cpStations } = await supabase
            .from("estaciones")
            .select("latitud, longitud")
            .eq("cp", postcode)
            .limit(50)

          if (cpStations && cpStations.length > 0) {
            centroidLat = cpStations.reduce((sum, s) => sum + s.latitud, 0) / cpStations.length
            centroidLng = cpStations.reduce((sum, s) => sum + s.longitud, 0) / cpStations.length
          }
        }

        if (centroidLat === null && location) {
          const normalized = location.trim().toUpperCase()
          const { data: locStations } = await supabase
            .from("estaciones")
            .select("latitud, longitud")
            .ilike("localidad", `%${normalized}%`)
            .limit(50)

          if (locStations && locStations.length > 0) {
            centroidLat = locStations.reduce((sum, s) => sum + s.latitud, 0) / locStations.length
            centroidLng = locStations.reduce((sum, s) => sum + s.longitud, 0) / locStations.length
          }
        }

        if (centroidLat === null || centroidLng === null) {
          setError(true)
          setLoading(false)
          return
        }

        const lat = centroidLat
        const lng = centroidLng
        const radius = 10

        const latDelta = radius / 111.0
        const lngDelta = radius / (111.0 * Math.cos((lat * Math.PI) / 180))

        type StationRow = {
          id: string
          rotulo: string
          direccion: string
          localidad: string
          latitud: number
          longitud: number
          precio_gasolina_95?: number
          precio_gasolina_98?: number
          precio_diesel?: number
          precio_diesel_premium?: number
          precio_glp?: number
        }

        const { data: nearby } = await supabase
          .from("estaciones")
          .select("id, rotulo, direccion, localidad, latitud, longitud, precio_gasolina_95, precio_gasolina_98, precio_diesel, precio_diesel_premium, precio_glp")
          .gte("latitud", lat - latDelta)
          .lte("latitud", lat + latDelta)
          .gte("longitud", lng - lngDelta)
          .lte("longitud", lng + lngDelta)
          .not(priceCol, "is", null)
          .gt(priceCol, 0)
          .limit(200)

        if (!nearby || nearby.length === 0) {
          setStations([])
          setLoading(false)
          return
        }

        const mapped: NearbyStation[] = (nearby as StationRow[])
          .map((s) => ({
            id: s.id,
            rotulo: s.rotulo,
            direccion: s.direccion,
            localidad: s.localidad,
            distancia: haversine(lat, lng, s.latitud, s.longitud),
            precio: s[priceCol as keyof StationRow] as number | undefined,
          }))
          .filter((s) => (s.distancia ?? 999) <= radius && s.precio != null)
          .sort((a, b) => (a.precio ?? 999) - (b.precio ?? 999))
          .slice(0, 5)

        setStations(mapped)
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    loadStations()
  }, [postcode, location, priceCol, canShow])

  if (!canShow) return null

  const fuelLabel = FUEL_LABELS[fuelType]
  const zoneLabel = postcode || location || ""

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="h-4 w-48 bg-slate-100 rounded animate-pulse" />
        </div>
        <div className="divide-y divide-slate-100">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="px-5 py-4 flex items-center gap-3">
              <div className="w-6 h-6 bg-slate-100 rounded-full animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-32 bg-slate-100 rounded animate-pulse" />
                <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
              </div>
              <div className="h-6 w-14 bg-slate-100 rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error || stations.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-emerald-600" />
            Las 5 más baratas cerca de casa
          </h2>
        </div>
        <div className="px-5 py-8 text-center">
          <MapPin className="h-8 w-8 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-500 font-medium">No se encontraron gasolineras</p>
          <p className="text-xs text-slate-400 mt-1">Actualiza tu código postal en los ajustes de zona</p>
        </div>
      </div>
    )
  }

  const lowestPrice = stations[0]?.precio

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-emerald-600" />
          Las 5 más baratas cerca de casa
        </h2>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{fuelLabel}</span>
          {zoneLabel && (
            <span className="text-xs text-slate-400 flex items-center gap-0.5">
              <MapPin className="h-3 w-3" />
              {zoneLabel}
            </span>
          )}
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {stations.map((station, i) => {
          const isCheapest = i === 0
          const savingsVsLast = lowestPrice && stations[stations.length - 1]?.precio
            ? ((stations[stations.length - 1].precio! - station.precio!) * 50).toFixed(2)
            : null

          return (
            <div key={station.id} className={cn("px-5 py-3.5 flex items-center gap-3", isCheapest && "bg-emerald-50/50")}>
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                isCheapest ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"
              )}>
                {i + 1}
              </div>

              <div className="flex-1 min-w-0">
                <p className={cn("font-semibold text-sm truncate", isCheapest ? "text-slate-900" : "text-slate-800")}>
                  {station.rotulo || "Gasolinera"}
                </p>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  {[station.direccion, station.localidad].filter(Boolean).join(", ")}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {station.distancia != null && (
                  <span className="text-xs text-slate-400">{station.distancia.toFixed(1)} km</span>
                )}
                <div className={cn(
                  "px-2.5 py-1 rounded-lg text-sm font-bold tabular-nums",
                  isCheapest ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"
                )}>
                  {station.precio?.toFixed(3)} €
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([station.rotulo, station.direccion, station.localidad].filter(Boolean).join(", "))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                  title="Cómo llegar"
                >
                  <Navigation className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          )
        })}
      </div>

      {lowestPrice && stations.length > 1 && (
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            Ahorras hasta{" "}
            <span className="font-semibold text-emerald-700">
              {((stations[stations.length - 1].precio! - lowestPrice) * 50).toFixed(2)} €
            </span>
            {" "}por depósito eligiendo la más barata
          </p>
        </div>
      )}
    </div>
  )
}
