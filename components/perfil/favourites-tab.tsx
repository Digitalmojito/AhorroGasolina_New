"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Heart, MapPin, Navigation, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase"
import { formatPrice } from "@/lib/format"
import { getBrandColor, getBrandInitials } from "@/lib/brands"
import type { Estacion } from "@/lib/types"

interface FavouritesTabProps {
  userId: string
}

interface FavouriteWithStation {
  station_id: string
  added_at: string
  station?: Estacion
}

function timeSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return "hace menos de 1h"
  if (hours < 24) return `hace ${hours}h`
  const days = Math.floor(hours / 24)
  return `hace ${days}d`
}

export function FavouritesTab({ userId }: FavouritesTabProps) {
  const [favourites, setFavourites] = useState<FavouriteWithStation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const supabase = createClient()
      const { data: favData } = await supabase
        .from("favourite_stations")
        .select("station_id, added_at")
        .eq("user_id", userId)
        .order("added_at", { ascending: false })

      if (!favData || favData.length === 0) {
        setFavourites([])
        setLoading(false)
        return
      }

      const ids = favData.map((f) => f.station_id)
      const { data: stationsData } = await supabase
        .from("estaciones")
        .select("*")
        .in("id", ids)

      const stationMap: Record<string, Estacion> = {}
      if (stationsData) {
        for (const row of stationsData as Record<string, unknown>[]) {
          const s: Estacion = {
            id: String(row.id),
            rotulo: String(row.rotulo ?? ""),
            direccion: String(row.direccion ?? ""),
            localidad: String(row.localidad ?? ""),
            provincia: String(row.provincia ?? ""),
            cp: String(row.cp ?? ""),
            latitud: Number(row.latitud),
            longitud: Number(row.longitud),
            horario: String(row.horario ?? ""),
            precioGasolina95: row.precio_gasolina_95 != null ? Number(row.precio_gasolina_95) : undefined,
            precioGasolina98: row.precio_gasolina_98 != null ? Number(row.precio_gasolina_98) : undefined,
            precioDiesel: row.precio_diesel != null ? Number(row.precio_diesel) : undefined,
            precioDieselPremium: row.precio_diesel_premium != null ? Number(row.precio_diesel_premium) : undefined,
            precioGLP: row.precio_glp != null ? Number(row.precio_glp) : undefined,
          }
          stationMap[s.id] = s
        }
      }

      setFavourites(
        favData.map((f) => ({
          station_id: f.station_id,
          added_at: f.added_at,
          station: stationMap[f.station_id],
        }))
      )
      setLoading(false)
    }

    load()
  }, [userId])

  async function handleRemove(stationId: string) {
    const supabase = createClient()
    await supabase
      .from("favourite_stations")
      .delete()
      .eq("user_id", userId)
      .eq("station_id", stationId)

    setFavourites((prev) => prev.filter((f) => f.station_id !== stationId))
  }

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <Heart className="h-4 w-4 text-red-500" />
            Mis favoritas
            {!loading && favourites.length > 0 && (
              <span className="text-xs font-normal text-slate-400 ml-1">({favourites.length})</span>
            )}
          </h2>
        </div>

        {loading ? (
          <div className="divide-y divide-slate-100">
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-slate-100 rounded animate-pulse w-36" />
                    <div className="h-3 bg-slate-100 rounded animate-pulse w-52" />
                    <div className="flex gap-2">
                      <div className="h-5 bg-slate-100 rounded-full animate-pulse w-16" />
                      <div className="h-5 bg-slate-100 rounded-full animate-pulse w-14" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : favourites.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="relative w-14 h-14 mx-auto mb-4">
              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center">
                <MapPin className="h-7 w-7 text-red-300" />
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
                <Heart className="h-2.5 w-2.5 text-red-400" />
              </div>
            </div>
            <p className="text-slate-700 font-semibold text-sm">Aún no tienes favoritas</p>
            <p className="text-xs text-slate-400 mt-1 mb-5 leading-relaxed max-w-xs mx-auto">
              Guarda las gasolineras que más usas para acceder rápido a sus precios
            </p>
            <Link href="/buscar">
              <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5">
                Buscar gasolineras
              </Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {favourites.map((fav) => {
              const station = fav.station
              if (!station) return null
              const color = getBrandColor(station.rotulo)
              const initials = getBrandInitials(station.rotulo)
              const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.latitud},${station.longitud}`

              return (
                <div key={fav.station_id} className="group">
                  <div className="flex items-start gap-3 px-5 pt-4 pb-3">
                    <div
                      className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-sm mt-0.5"
                      style={{ backgroundColor: color }}
                    >
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-sm leading-tight">{station.rotulo}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 text-slate-400 flex-shrink-0" />
                            <p className="text-xs text-slate-500 truncate">{station.direccion}, {station.localidad}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemove(fav.station_id)}
                          className="flex-shrink-0 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Quitar de favoritos"
                        >
                          <Heart className="h-3.5 w-3.5 fill-current" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {station.precioGasolina95 !== undefined && (
                          <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full border border-emerald-100">
                            G95 {formatPrice(station.precioGasolina95)}€
                          </span>
                        )}
                        {station.precioDiesel !== undefined && (
                          <span className="text-xs bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded-full border border-amber-100">
                            DSL {formatPrice(station.precioDiesel)}€
                          </span>
                        )}
                        {station.precioGasolina98 !== undefined && (
                          <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-full border border-blue-100">
                            G98 {formatPrice(station.precioGasolina98)}€
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-5 pb-3">
                    <Link href={`/estacion/${station.id}`} className="flex-1">
                      <button className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-200 text-xs font-semibold text-slate-600 hover:text-emerald-700 transition-colors">
                        <ExternalLink className="h-3 w-3" />
                        Ver detalle
                      </button>
                    </Link>
                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                      <button className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-200 text-xs font-semibold text-slate-600 hover:text-emerald-700 transition-colors">
                        <Navigation className="h-3 w-3" />
                        Cómo llegar
                      </button>
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
