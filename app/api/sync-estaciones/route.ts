import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"
export const maxDuration = 300

const GOV_API_URL =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/"

function parseNum(str: string | undefined): number | null {
  if (!str || str.trim() === "") return null
  const n = parseFloat(str.replace(",", "."))
  return isNaN(n) ? null : n
}

async function fetchWithRetry(url: string, attempts = 3): Promise<Response> {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(120000),
      })
      if (res.ok) return res
      if (i === attempts - 1) throw new Error(`MINETUR API error: ${res.status}`)
    } catch (err) {
      if (i === attempts - 1) throw err
      await new Promise((r) => setTimeout(r, 3000))
    }
  }
  throw new Error("Unreachable")
}

export async function POST(req: NextRequest) {
  const secret = process.env.SYNC_SECRET
  if (secret) {
    const authHeader = req.headers.get("authorization")
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const supabase = createAdminClient()

  try {
    console.log("Fetching stations from MINETUR API...")
    const res = await fetchWithRetry(GOV_API_URL)
    const data = await res.json()
    const list: Record<string, string>[] = data?.ListaEESSPrecio ?? data?.ListaEESSS ?? []
    console.log(`Received ${list.length} raw stations`)

    const now = new Date().toISOString()
    const stations = list
      .map((r) => {
        const lat = parseNum(r["Latitud"])
        const lng = parseNum(r["Longitud (WGS84)"])
        if (!r["IDEESS"] || !lat || !lng) return null
        return {
          id: r["IDEESS"],
          rotulo: r["Rótulo"] ?? "",
          direccion: r["Dirección"] ?? "",
          localidad: r["Localidad"] ?? "",
          provincia: r["Provincia"] ?? "",
          cp: r["C.P."] ?? "",
          latitud: lat,
          longitud: lng,
          horario: r["Horario"] ?? "",
          precio_gasolina_95: parseNum(r["Precio Gasolina 95 E5"]),
          precio_gasolina_98: parseNum(r["Precio Gasolina 98 E5"]),
          precio_diesel: parseNum(r["Precio Gasoleo A"]),
          precio_diesel_premium: parseNum(r["Precio Gasoleo Premium"]),
          precio_glp: parseNum(r["Precio Gases licuados del petróleo"]),
          updated_at: now,
        }
      })
      .filter((s): s is NonNullable<typeof s> => s !== null)

    console.log(`Mapped ${stations.length} valid stations`)

    const BATCH_SIZE = 500
    let upserted = 0
    for (let i = 0; i < stations.length; i += BATCH_SIZE) {
      const batch = stations.slice(i, i + BATCH_SIZE)
      const { error } = await supabase
        .from("estaciones")
        .upsert(batch, { onConflict: "id" })
      if (error) throw new Error(`Upsert error at batch ${i}: ${error.message}`)
      upserted += batch.length
    }

    await supabase
      .from("sync_log")
      .insert({ stations_count: stations.length, status: "success" })

    return NextResponse.json({ success: true, stations_count: stations.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("Sync failed:", message)
    await supabase
      .from("sync_log")
      .insert({ status: "error", error_message: message })
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
