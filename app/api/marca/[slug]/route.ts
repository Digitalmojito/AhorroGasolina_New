import { NextRequest, NextResponse } from "next/server"
import type { Estacion } from "@/lib/types"
import { SAMPLE_STATIONS } from "@/lib/sample-data"
import { getBrandBySlug } from "@/lib/brands"
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

function avg(vals: (number | undefined)[]): number | undefined {
  const valid = vals.filter((v): v is number => v !== undefined)
  return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : undefined
}

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const slug = params.slug.toLowerCase()
  const brand = getBrandBySlug(slug)

  try {
    const encodedSlug = encodeURIComponent(`%${slug}%`)
    const rows = await pgQuery<Row>(
      "estaciones",
      `select=*&rotulo=ilike.${encodedSlug}&limit=500`
    )

    if (!rows.length) throw new Error("No data")

    const stations: Estacion[] = rows.map(toEstacion)
    const avgGasolina95 = avg(stations.map((s) => s.precioGasolina95))
    const avgDiesel = avg(stations.map((s) => s.precioDiesel))

    return NextResponse.json({
      brand: { ...brand, stations: stations.length, avgGasolina95, avgDiesel },
      stations: stations.slice(0, 200),
    })
  } catch {
    const fallback = SAMPLE_STATIONS.filter((s) => s.rotulo.toLowerCase().includes(slug))
    const avgGasolina95 = avg(fallback.map((s) => s.precioGasolina95))
    const avgDiesel = avg(fallback.map((s) => s.precioDiesel))
    return NextResponse.json({
      brand: { ...brand, stations: fallback.length, avgGasolina95, avgDiesel },
      stations: fallback,
    })
  }
}
