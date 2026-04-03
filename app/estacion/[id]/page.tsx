import type { Metadata } from "next"
import Link from "next/link"
import { MapPin, Clock, ArrowLeft, Fuel } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StationCard } from "@/components/station-card"
import { FavouriteButton } from "@/components/favourite-button"
import { NavigateButton } from "@/components/station/navigate-button"
import { PriceChart } from "@/components/station/price-chart"
import type { Estacion } from "@/lib/types"
import { formatPrice } from "@/lib/format"
import { getBrandColor, getBrandInitials } from "@/lib/brands"
import { FUEL_LABELS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { createAdminClient } from "@/lib/supabase-server"
import { haversine } from "@/lib/haversine"

export const metadata: Metadata = {
  title: "Detalle de gasolinera - AhorroGasolina.es",
}

interface PageProps {
  params: { id: string }
}

function rowToEstacion(row: Record<string, unknown>): Estacion {
  return {
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
}

interface PriceSnapshot {
  snapshot_date: string
  precio_gasolina_95: number | null
  precio_gasolina_98: number | null
  precio_diesel: number | null
  precio_diesel_premium: number | null
  precio_glp: number | null
}

async function getStationData(id: string): Promise<{
  station: Estacion
  nearby: Estacion[]
  snapshots: PriceSnapshot[]
} | null> {
  try {
    const numericId = Number(id)
    const supabase = createAdminClient()
    const { data: raw, error } = await supabase
      .from("estaciones")
      .select("*")
      .eq("id", numericId)
      .maybeSingle()

    if (error || !raw) return null

    const station = rowToEstacion(raw as Record<string, unknown>)

    const latDelta = 0.2
    const lngDelta = 0.2
    const { data: nearbyRaw } = await supabase
      .from("estaciones")
      .select("*")
      .neq("id", numericId)
      .gte("latitud", station.latitud - latDelta)
      .lte("latitud", station.latitud + latDelta)
      .gte("longitud", station.longitud - lngDelta)
      .lte("longitud", station.longitud + lngDelta)
      .limit(50)

    const nearby: Estacion[] = ((nearbyRaw ?? []) as Record<string, unknown>[])
      .map((r) => ({
        ...rowToEstacion(r),
        distancia: haversine(station.latitud, station.longitud, Number(r.latitud), Number(r.longitud)),
      }))
      .sort((a, b) => (a.distancia ?? 0) - (b.distancia ?? 0))
      .slice(0, 5)

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const { data: snapshotRaw } = await supabase
      .from("station_price_snapshots")
      .select("snapshot_date, precio_gasolina_95, precio_gasolina_98, precio_diesel, precio_diesel_premium, precio_glp")
      .eq("station_id", id)
      .gte("snapshot_date", thirtyDaysAgo.toISOString().split("T")[0])
      .order("snapshot_date", { ascending: true })

    const snapshots: PriceSnapshot[] = (snapshotRaw ?? []).map((s) => ({
      snapshot_date: String(s.snapshot_date),
      precio_gasolina_95: s.precio_gasolina_95 != null ? Number(s.precio_gasolina_95) : null,
      precio_gasolina_98: s.precio_gasolina_98 != null ? Number(s.precio_gasolina_98) : null,
      precio_diesel: s.precio_diesel != null ? Number(s.precio_diesel) : null,
      precio_diesel_premium: s.precio_diesel_premium != null ? Number(s.precio_diesel_premium) : null,
      precio_glp: s.precio_glp != null ? Number(s.precio_glp) : null,
    }))

    return { station, nearby, snapshots }
  } catch {
    return null
  }
}

function getPriceLabel(price: number, nearbyPrices: number[]): { statusClass: string; statusText: string; priceClass: string } {
  if (nearbyPrices.length < 2) {
    return { statusClass: "text-slate-500 bg-slate-50 border-slate-200", statusText: "Sin datos", priceClass: "text-slate-900" }
  }
  const sorted = [...nearbyPrices].sort((a, b) => a - b)
  const p33 = sorted[Math.floor(sorted.length * 0.33)] ?? sorted[0]
  const p66 = sorted[Math.floor(sorted.length * 0.66)] ?? sorted[sorted.length - 1]

  if (price <= p33) {
    return { statusClass: "text-emerald-700 bg-emerald-50 border-emerald-200", statusText: "Barato", priceClass: "text-emerald-700" }
  }
  if (price > p66) {
    return { statusClass: "text-red-600 bg-red-50 border-red-200", statusText: "Caro", priceClass: "text-red-600" }
  }
  return { statusClass: "text-amber-600 bg-amber-50 border-amber-200", statusText: "Precio medio", priceClass: "text-amber-700" }
}

function PriceRow({ label, price, nearbyPrices }: { label: string; price?: number; nearbyPrices: number[] }) {
  if (price === undefined) return null
  const { statusClass, statusText, priceClass } = getPriceLabel(price, nearbyPrices)

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
      <div>
        <p className="font-semibold text-slate-900">{label}</p>
        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", statusClass)}>
          {statusText}
        </span>
      </div>
      <p className={cn("text-2xl font-extrabold tabular-nums", priceClass)}>{formatPrice(price)}</p>
    </div>
  )
}

export default async function EstacionPage({ params }: PageProps) {
  const data = await getStationData(params.id)

  if (!data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <Fuel className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Gasolinera no encontrada</h1>
        <p className="text-slate-500 mb-6">No pudimos encontrar esta gasolinera.</p>
        <Link href="/buscar">
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">Volver a buscar</Button>
        </Link>
      </div>
    )
  }

  const { station, nearby, snapshots } = data
  const color = getBrandColor(station.rotulo)
  const initials = getBrandInitials(station.rotulo)
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.latitud},${station.longitud}`

  const nearbyPricesMap = {
    gasolina95: nearby.map((s) => s.precioGasolina95).filter((p): p is number => p !== undefined),
    gasolina98: nearby.map((s) => s.precioGasolina98).filter((p): p is number => p !== undefined),
    diesel: nearby.map((s) => s.precioDiesel).filter((p): p is number => p !== undefined),
    dieselPremium: nearby.map((s) => s.precioDieselPremium).filter((p): p is number => p !== undefined),
    glp: nearby.map((s) => s.precioGLP).filter((p): p is number => p !== undefined),
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <Link href="/buscar">
          <Button variant="ghost" className="mb-4 -ml-2 text-slate-600 hover:text-slate-900 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver al buscador
          </Button>
        </Link>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-4">
          <div className="flex items-start gap-4">
            <div
              className="flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-sm"
              style={{ backgroundColor: color }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-extrabold text-slate-900">{station.rotulo}</h1>
              <div className="flex items-start gap-1.5 mt-1 text-slate-500">
                <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{station.direccion}, {station.localidad}, {station.provincia}</p>
              </div>
              {station.horario && (
                <div className="flex items-center gap-1.5 mt-1 text-slate-500">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <p className="text-sm">{station.horario}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 mt-5">
            <div className="flex-1">
              <NavigateButton station={station} mapsUrl={mapsUrl} />
            </div>
            <Link href={`/marca/${station.rotulo.toLowerCase().replace(/\s+/g, "")}`} className="flex-1">
              <Button variant="outline" className="w-full border-slate-200 gap-2">
                <Fuel className="h-4 w-4" />
                Ver marca
              </Button>
            </Link>
            <FavouriteButton stationId={station.id} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-4">
          <h2 className="font-bold text-slate-900 text-lg mb-4">Precios de combustible</h2>
          <div className="space-y-2">
            {FUEL_LABELS.map((fl) => {
              const priceMap: Record<string, number | undefined> = {
                gasolina95: station.precioGasolina95,
                gasolina98: station.precioGasolina98,
                diesel: station.precioDiesel,
                dieselPremium: station.precioDieselPremium,
                glp: station.precioGLP,
              }
              return (
                <PriceRow
                  key={fl.key}
                  label={fl.label}
                  price={priceMap[fl.key]}
                  nearbyPrices={nearbyPricesMap[fl.key as keyof typeof nearbyPricesMap]}
                />
              )
            })}
          </div>
        </div>

        <div className="mb-4">
          <PriceChart snapshots={snapshots} />
        </div>

        {nearby.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="font-bold text-slate-900 text-lg mb-4">Gasolineras cercanas</h2>
            <div className="space-y-3">
              {nearby.map((s) => (
                <StationCard
                  key={s.id}
                  station={s}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
