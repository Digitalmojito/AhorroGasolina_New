import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
}

type ChargerStatus = "operational" | "unavailable" | "unknown" | "planned" | "removed"
type PlugType = "type2" | "ccs" | "chademo" | "schuko" | "tesla" | "nacs" | "other"
type SpeedTier = "slow" | "fast" | "rapid" | "ultra_rapid"
type CurrentType = "ac" | "dc" | "unknown"

function parseOcmStatus(statusTitle: string | null | undefined): ChargerStatus {
  if (!statusTitle) return "unknown"
  const t = statusTitle.toLowerCase()
  if (t.includes("operational") || t.includes("available")) return "operational"
  if (t.includes("unavailable") || t.includes("offline")) return "unavailable"
  if (t.includes("planned") || t.includes("construction")) return "planned"
  if (t.includes("removed")) return "removed"
  return "unknown"
}

function parseOcmPlugType(connectionTitle: string | null | undefined): PlugType {
  if (!connectionTitle) return "other"
  const t = connectionTitle.toLowerCase()
  if (t.includes("ccs") || t.includes("combo")) return "ccs"
  if (t.includes("chademo") || t.includes("cha-demo")) return "chademo"
  if (t.includes("tesla")) return "tesla"
  if (t.includes("nacs")) return "nacs"
  if (t.includes("schuko") || t.includes("type 1") || t.includes("j1772")) return "schuko"
  if (t.includes("type 2") || t.includes("mennekes") || t.includes("iec 62196-2")) return "type2"
  return "other"
}

function parseOcmCurrentType(currentTypeId: number | null | undefined): CurrentType {
  if (currentTypeId === 1 || currentTypeId === 30) return "ac"
  if (currentTypeId === 2 || currentTypeId === 20) return "dc"
  return "unknown"
}

function getSpeedTier(powerKw: number | null | undefined): SpeedTier {
  if (!powerKw) return "slow"
  if (powerKw <= 7) return "slow"
  if (powerKw <= 22) return "fast"
  if (powerKw <= 50) return "rapid"
  return "ultra_rapid"
}

function parseOcmCost(costStr: string | null | undefined) {
  if (!costStr) return { perKwh: null, perMinute: null, isFree: false }
  const lower = costStr.toLowerCase()
  if (
    lower === "free" || lower === "gratis" ||
    lower.includes("no charge") || lower.includes("free of charge") ||
    lower.includes("gratuito") || lower.includes("0 eur") || lower.includes("0eur")
  ) {
    return { perKwh: null, perMinute: null, isFree: true }
  }
  let perKwh: number | null = null
  let perMinute: number | null = null
  const kwhMatch = costStr.match(/(\d+[.,]\d+|\d+)\s*(?:€|eur|euro)?\s*\/?\s*k?wh/i)
  if (kwhMatch) perKwh = parseFloat(kwhMatch[1].replace(",", "."))
  const minMatch = costStr.match(/(\d+[.,]\d+|\d+)\s*(?:€|eur|euro|c|cent)?\s*\/?\s*min/i)
  if (minMatch) perMinute = parseFloat(minMatch[1].replace(",", "."))
  return { perKwh, perMinute, isFree: false }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const ocmApiKey = Deno.env.get("OCM_API_KEY") ?? ""

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const pageSize = 500
    let offset = 0
    let totalInserted = 0
    let totalUpdated = 0
    let hasMore = true

    while (hasMore) {
      const ocmUrl = new URL("https://api.openchargemap.io/v3/poi/")
      ocmUrl.searchParams.set("output", "json")
      ocmUrl.searchParams.set("countrycode", "ES")
      ocmUrl.searchParams.set("maxresults", String(pageSize))
      ocmUrl.searchParams.set("offset", String(offset))
      ocmUrl.searchParams.set("compact", "false")
      ocmUrl.searchParams.set("verbose", "false")
      ocmUrl.searchParams.set("includecomments", "false")
      if (ocmApiKey) ocmUrl.searchParams.set("key", ocmApiKey)

      const res = await fetch(ocmUrl.toString(), {
        headers: { "User-Agent": "AhorroGasolina.es/1.0" },
      })

      if (!res.ok) {
        const body = await res.text()
        throw new Error(`OCM API error ${res.status}: ${body}`)
      }

      const pois = await res.json() as Record<string, unknown>[]

      if (!pois.length) {
        hasMore = false
        break
      }

      for (const poi of pois) {
        const addr = poi.AddressInfo as Record<string, unknown>
        if (!addr?.Latitude || !addr?.Longitude) continue

        const costStr = (poi.UsageCost as string | null) ?? null
        const { perKwh, perMinute, isFree } = parseOcmCost(costStr)

        const statusType = poi.StatusType as Record<string, unknown> | null
        const statusTitle = (statusType?.Title as string) ?? null

        const operatorInfo = poi.OperatorInfo as Record<string, unknown> | null
        const operatorName = (operatorInfo?.Title as string) ?? ""

        const usageType = poi.UsageType as Record<string, unknown> | null
        const accessType = (usageType?.Title as string) ?? "public"

        const dateStatusUpdated = (poi.DateLastStatusUpdate as string) ?? null

        const chargerRow = {
          ocm_id: poi.ID as number,
          name: (addr.Title as string) ?? "",
          operator_name: operatorName,
          address: (addr.AddressLine1 as string) ?? "",
          city: (addr.Town as string) ?? "",
          province: (addr.StateOrProvince as string) ?? "",
          postcode: (addr.Postcode as string) ?? "",
          lat: addr.Latitude as number,
          lng: addr.Longitude as number,
          status: parseOcmStatus(statusTitle),
          status_last_updated: dateStatusUpdated,
          usage_cost_raw: costStr,
          usage_cost_per_kwh: perKwh,
          usage_cost_per_minute: perMinute,
          is_free: isFree,
          access_type: accessType,
          ocm_url: `https://openchargemap.org/site/poi/details/${poi.ID}`,
          last_synced_at: new Date().toISOString(),
        }

        const { data: chargerData, error: chargerError } = await supabase
          .from("chargers")
          .upsert(chargerRow, { onConflict: "ocm_id" })
          .select("id")
          .maybeSingle()

        if (chargerError) {
          console.error(`Error upserting charger ${poi.ID}:`, chargerError.message)
          continue
        }

        if (!chargerData?.id) continue

        const connections = (poi.Connections as Record<string, unknown>[]) ?? []

        if (connections.length) {
          await supabase.from("charger_connectors").delete().eq("charger_id", chargerData.id)

          const connectorRows = connections.map((conn) => {
            const connType = conn.ConnectionType as Record<string, unknown> | null
            const connStatus = conn.StatusType as Record<string, unknown> | null
            const powerKw = (conn.PowerKW as number) ?? null
            const currentTypeId = conn.CurrentTypeID as number | null

            return {
              charger_id: chargerData.id,
              ocm_connection_id: (conn.ID as number) ?? null,
              plug_type: parseOcmPlugType((connType?.Title as string) ?? null),
              plug_type_label: (connType?.Title as string) ?? "",
              current_type: parseOcmCurrentType(currentTypeId),
              power_kw: powerKw,
              speed_tier: getSpeedTier(powerKw),
              quantity: (conn.Quantity as number) ?? 1,
              connector_status: parseOcmStatus((connStatus?.Title as string) ?? null),
            }
          })

          const { error: connErr } = await supabase.from("charger_connectors").insert(connectorRows)
          if (connErr) console.error(`Connector insert error for charger ${poi.ID}:`, connErr.message)
        }

        totalInserted++
      }

      if (pois.length < pageSize) {
        hasMore = false
      } else {
        offset += pageSize
        totalUpdated = offset
      }
    }

    const result = {
      success: true,
      total_processed: totalInserted,
      pages_fetched: Math.ceil((totalInserted + totalUpdated) / pageSize),
      synced_at: new Date().toISOString(),
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
