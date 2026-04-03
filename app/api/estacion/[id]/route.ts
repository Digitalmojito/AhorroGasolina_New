import { NextRequest, NextResponse } from "next/server"
import type { Estacion } from "@/lib/types"
import { SAMPLE_STATIONS } from "@/lib/sample-data"
import { haversine } from "@/lib/haversine"
import { pgQuery } from "@/lib/pg-rest"

type Row = {
  id: number; rotulo: string; direccion: string; localidad: string
  provincia: string; cp: string; latitud: number; longitud: number
  horario: string; precio_gasolina_95: number | null
  precio_gasolina_98: number | null; precio_diesel: number | null
  precio_diesel_premium: number | null; precio_glp: number | null
}

function toEstacion(r: Row): Estacion {
  return {
    id: String(r.id), rotulo: r.rotulo ?? "", direccion: r.direccion ?? "",
    localidad: r.localidad ?? "", provincia: r.provincia ?? "", cp: r.cp ?? "",
    latitud: Number(r.latitud), longitud: Number(r.longitud), horario: r.horario ?? "",
    precioGasolina95: r.precio_gasolina_95 != null ? Number(r.precio_gasolina_95) : undefined,
    precioGasolina98: r.precio_gasolina_98 != null ? Number(r.precio_gasolina_98) : undefined,
    precioDiesel: r.precio_diesel != null ? Number(r.precio_diesel) : undefined,
    precioDieselPremium: r.precio_diesel_premium != null ? Number(r.precio_diesel_premium) : undefined,
    precioGLP: r.precio_glp != null ? Number(r.precio_glp) : undefined,
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id

  try {
    const rows = await pgQuery<Row>("estaciones", `select=*&id=eq.${id}&limit=1`)
    if (!rows.length) return NextResponse.json({ error: "No encontrada" }, { status: 404 })

    const station = toEstacion(rows[0])
    const d = 0.2
    const nearbyRows = await pgQuery<Row>(
      "estaciones",
      `select=*&id=neq.${id}&latitud=gte.${station.latitud - d}&latitud=lte.${station.latitud + d}&longitud=gte.${station.longitud - d}&longitud=lte.${station.longitud + d}&limit=50`
    )

    const nearby: Estacion[] = nearbyRows
      .map((r) => ({
        ...toEstacion(r),
        distancia: haversine(station.latitud, station.longitud, Number(r.latitud), Number(r.longitud)),
      }))
      .sort((a, b) => (a.distancia ?? 0) - (b.distancia ?? 0))
      .slice(0, 5)

    return NextResponse.json({ station, nearby })
  } catch {
    const sample = SAMPLE_STATIONS.find((s) => s.id === id)
    if (!sample) {
      return NextResponse.json({ station: SAMPLE_STATIONS[0], nearby: SAMPLE_STATIONS.slice(1, 6) })
    }
    const nearby = SAMPLE_STATIONS.filter((s) => s.id !== id)
      .map((s) => ({ ...s, distancia: haversine(sample.latitud, sample.longitud, s.latitud, s.longitud) }))
      .sort((a, b) => (a.distancia ?? 0) - (b.distancia ?? 0))
      .slice(0, 5)
    return NextResponse.json({ station: sample, nearby })
  }
}
