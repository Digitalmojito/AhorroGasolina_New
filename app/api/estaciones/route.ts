import { NextRequest, NextResponse } from "next/server"
import type { Estacion } from "@/lib/types"
import { haversine } from "@/lib/haversine"
import { pgQuery } from "@/lib/pg-rest"

type Row = {
  id: number; rotulo: string; direccion: string; localidad: string
  provincia: string; cp: string; latitud: number; longitud: number
  horario: string; precio_gasolina_95: number | null
  precio_gasolina_98: number | null; precio_diesel: number | null
  precio_diesel_premium: number | null; precio_glp: number | null
}

function toEstacion(r: Row, lat?: number, lng?: number): Estacion {
  const s: Estacion = {
    id: String(r.id), rotulo: r.rotulo ?? "", direccion: r.direccion ?? "",
    localidad: r.localidad ?? "", provincia: r.provincia ?? "", cp: r.cp ?? "",
    latitud: Number(r.latitud), longitud: Number(r.longitud), horario: r.horario ?? "",
    precioGasolina95: r.precio_gasolina_95 != null ? Number(r.precio_gasolina_95) : undefined,
    precioGasolina98: r.precio_gasolina_98 != null ? Number(r.precio_gasolina_98) : undefined,
    precioDiesel: r.precio_diesel != null ? Number(r.precio_diesel) : undefined,
    precioDieselPremium: r.precio_diesel_premium != null ? Number(r.precio_diesel_premium) : undefined,
    precioGLP: r.precio_glp != null ? Number(r.precio_glp) : undefined,
  }
  if (lat !== undefined && lng !== undefined) s.distancia = haversine(lat, lng, s.latitud, s.longitud)
  return s
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const lat = parseFloat(searchParams.get("lat") ?? "")
  const lng = parseFloat(searchParams.get("lng") ?? "")
  const radius = parseFloat(searchParams.get("radio") ?? "10")
  const hasCoords = !isNaN(lat) && !isNaN(lng)

  try {
    let qs = "select=*&limit=500"
    if (hasCoords) {
      const dLat = radius / 111.0
      const dLng = radius / (111.0 * Math.cos((lat * Math.PI) / 180))
      qs += `&latitud=gte.${lat - dLat}&latitud=lte.${lat + dLat}&longitud=gte.${lng - dLng}&longitud=lte.${lng + dLng}`
    }

    const rows = await pgQuery<Row>("estaciones", qs)
    if (!rows.length) return NextResponse.json([])

    let stations = rows.map((r) => toEstacion(r, hasCoords ? lat : undefined, hasCoords ? lng : undefined))
    if (hasCoords) {
      stations = stations
        .filter((s) => s.distancia! <= radius)
        .sort((a, b) => (a.distancia ?? 0) - (b.distancia ?? 0))
        .slice(0, 100)
    }
    return NextResponse.json(stations)
  } catch {
    return NextResponse.json(
      { error: "Los precios no están disponibles en este momento. Por favor, inténtalo de nuevo." },
      { status: 503 }
    )
  }
}
