import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
}

const GOV_API_URL =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/"

function parseNum(str: string | undefined): number | null {
  if (!str || str.trim() === "") return null
  const n = parseFloat(str.replace(",", "."))
  return isNaN(n) ? null : n
}

async function fetchWithRetry(url: string, attempts = 3): Promise<Response> {
  for (let i = 0; i < attempts; i++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 150000)
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      if (res.ok) return res
      if (i === attempts - 1) throw new Error(`MINETUR API error: ${res.status}`)
    } catch (err) {
      clearTimeout(timeoutId)
      if (i === attempts - 1) throw err
      console.log(`Attempt ${i + 1} failed, retrying...`)
      await new Promise((r) => setTimeout(r, 3000))
    }
  }
  throw new Error("Unreachable")
}

async function runSync() {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  try {
    console.log("Fetching stations from MINETUR API...")
    const res = await fetchWithRetry(GOV_API_URL)

    const text = await res.text()
    console.log(`Response size: ${text.length} bytes`)
    const data = JSON.parse(text)
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
      console.log(`Upserted ${upserted}/${stations.length}`)
    }

    const { error: logError } = await supabase
      .from("sync_log")
      .insert({ stations_count: stations.length, status: "success" })

    if (logError) console.error("sync_log insert error:", logError.message)

    console.log(`Sync complete: ${stations.length} stations upserted`)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("Sync failed:", message)

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )
    const { error: logError } = await supabase
      .from("sync_log")
      .insert({ status: "error", error_message: message })
    if (logError) console.error("sync_log error insert failed:", logError.message)
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  EdgeRuntime.waitUntil(runSync())

  return new Response(
    JSON.stringify({ success: true, message: "Sync started" }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  )
})
