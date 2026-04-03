import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const ocmApiKey = Deno.env.get("OCM_API_KEY") ?? ""
    const url = new URL(req.url)
    const lat = url.searchParams.get("lat")
    const lng = url.searchParams.get("lng")
    const distance = url.searchParams.get("distance") ?? "20"
    const maxResults = url.searchParams.get("maxresults") ?? "500"

    if (!lat || !lng) {
      return new Response(JSON.stringify({ error: "lat and lng required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const ocmUrl = new URL("https://api.openchargemap.io/v3/poi/")
    ocmUrl.searchParams.set("output", "json")
    ocmUrl.searchParams.set("latitude", lat)
    ocmUrl.searchParams.set("longitude", lng)
    ocmUrl.searchParams.set("distance", distance)
    ocmUrl.searchParams.set("distanceunit", "KM")
    ocmUrl.searchParams.set("maxresults", maxResults)
    ocmUrl.searchParams.set("compact", "false")
    ocmUrl.searchParams.set("verbose", "false")
    ocmUrl.searchParams.set("includecomments", "false")
    if (ocmApiKey) ocmUrl.searchParams.set("key", ocmApiKey)

    const res = await fetch(ocmUrl.toString(), {
      headers: { "User-Agent": "AhorroGasolina.es/1.0" },
    })

    if (!res.ok) {
      const body = await res.text()
      return new Response(JSON.stringify({ error: `OCM API error ${res.status}: ${body}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const data = await res.json()

    return new Response(JSON.stringify(data), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=180, stale-while-revalidate=60",
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
