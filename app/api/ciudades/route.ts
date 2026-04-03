import { NextRequest, NextResponse } from "next/server"
import { pgQuery } from "@/lib/pg-rest"

export interface CiudadSuggestion {
  localidad: string
  provincia: string
  lat: number
  lng: number
  stationCount: number
}

type Row = { localidad: string; provincia: string; latitud: number; longitud: number }

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? ""
  if (q.length < 2) return NextResponse.json([])

  try {
    const encoded = encodeURIComponent(`${q}%`)
    const rows = await pgQuery<Row>(
      "estaciones",
      `select=localidad,provincia,latitud,longitud&localidad=ilike.${encoded}&limit=500`
    )

    if (!rows.length) return NextResponse.json([])

    const cityMap = new Map<string, { provincia: string; lats: number[]; lngs: number[]; count: number }>()
    for (const row of rows) {
      const key = `${row.localidad}||${row.provincia}`
      if (!cityMap.has(key)) cityMap.set(key, { provincia: row.provincia, lats: [], lngs: [], count: 0 })
      const entry = cityMap.get(key)!
      entry.lats.push(row.latitud)
      entry.lngs.push(row.longitud)
      entry.count++
    }

    const suggestions: CiudadSuggestion[] = Array.from(cityMap.entries())
      .map(([key, val]) => ({
        localidad: key.split("||")[0],
        provincia: val.provincia,
        lat: val.lats.reduce((a, b) => a + b, 0) / val.lats.length,
        lng: val.lngs.reduce((a, b) => a + b, 0) / val.lngs.length,
        stationCount: val.count,
      }))
      .sort((a, b) => b.stationCount - a.stationCount)
      .slice(0, 8)

    return NextResponse.json(suggestions)
  } catch {
    return NextResponse.json([])
  }
}
