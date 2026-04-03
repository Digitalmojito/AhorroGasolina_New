import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
}

const EMAILIT_API_URL = "https://api.emailit.com/v2/emails"
const FROM_EMAIL = "notificaciones@ahorrogasolina.es"
const APP_URL = "https://ahorrogasolina.es"

interface Estacion {
  id: string
  rotulo: string
  direccion: string
  localidad: string
  provincia: string
  precio_gasolina_95: number | null
  precio_gasolina_98: number | null
  precio_diesel: number | null
  precio_diesel_premium: number | null
  precio_glp: number | null
}

interface Snapshot {
  station_id: string
  precio_gasolina_95: number | null
  precio_gasolina_98: number | null
  precio_diesel: number | null
  precio_diesel_premium: number | null
  precio_glp: number | null
}

type FuelKey = "precio_gasolina_95" | "precio_gasolina_98" | "precio_diesel" | "precio_diesel_premium" | "precio_glp"

const FUEL_LABELS: Record<FuelKey, string> = {
  precio_gasolina_95: "Gasolina 95",
  precio_gasolina_98: "Gasolina 98",
  precio_diesel: "Diésel",
  precio_diesel_premium: "Diésel Premium",
  precio_glp: "GLP",
}

async function sendEmail(apiKey: string, to: string, subject: string, html: string): Promise<void> {
  await fetch(EMAILIT_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  })
}

function priceAlertHtml(
  displayName: string,
  drops: { station: Estacion; fuelLabel: string; oldPrice: number; newPrice: number; dropPct: number }[]
): string {
  const rows = drops
    .map(
      (d) => `
    <tr style="border-bottom:1px solid #f1f5f9;">
      <td style="padding:12px 0;">
        <p style="margin:0;font-weight:700;color:#0f172a;">${d.station.rotulo}</p>
        <p style="margin:2px 0 0;font-size:13px;color:#64748b;">${d.station.direccion}, ${d.station.localidad}</p>
        <p style="margin:4px 0 0;font-size:12px;color:#64748b;">${d.fuelLabel}</p>
      </td>
      <td style="padding:12px 0;text-align:right;white-space:nowrap;">
        <span style="text-decoration:line-through;color:#94a3b8;font-size:13px;">${d.oldPrice.toFixed(3)}€</span><br>
        <span style="font-size:22px;font-weight:900;color:#059669;">${d.newPrice.toFixed(3)}€</span><br>
        <span style="font-size:12px;color:#10b981;font-weight:600;">-${d.dropPct.toFixed(1)}%</span>
      </td>
    </tr>`
    )
    .join("")

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr>
          <td style="padding-bottom:24px;text-align:center;">
            <h1 style="margin:0;font-size:22px;font-weight:900;color:#0f172a;">
              Ahorro<span style="color:#059669;">Gasolina</span><span style="color:#94a3b8;">.es</span>
            </h1>
          </td>
        </tr>
        <tr>
          <td style="background:#fff;border-radius:16px;border:1px solid #e2e8f0;padding:32px;">
            <h2 style="margin:0 0 8px;font-size:18px;font-weight:800;color:#0f172a;">Bajada de precio detectada</h2>
            <p style="margin:0 0 24px;color:#475569;font-size:14px;">
              Hola ${displayName || "usuario"}, hemos detectado bajadas de precio en tus gasolineras favoritas.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${rows}
            </table>
            <div style="margin-top:28px;text-align:center;">
              <a href="${APP_URL}/buscar" style="display:inline-block;background:#059669;color:#fff;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none;">
                Ver todas las gasolineras
              </a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 0 0;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              Recibes este correo porque tienes activadas las alertas de precio en AhorroGasolina.es.
              <br>Puedes desactivarlas desde <a href="${APP_URL}/perfil?tab=notificaciones" style="color:#059669;">tu perfil</a>.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function weeklyDigestHtml(
  displayName: string,
  stations: Estacion[]
): string {
  const rows = stations
    .slice(0, 5)
    .map(
      (s) => `
    <tr style="border-bottom:1px solid #f1f5f9;">
      <td style="padding:12px 0;">
        <p style="margin:0;font-weight:700;color:#0f172a;">${s.rotulo}</p>
        <p style="margin:2px 0 0;font-size:13px;color:#64748b;">${s.direccion}, ${s.localidad}</p>
      </td>
      <td style="padding:12px 0;text-align:right;">
        ${s.precio_gasolina_95 != null ? `<span style="font-size:14px;font-weight:700;color:#059669;">G95: ${s.precio_gasolina_95.toFixed(3)}€</span><br>` : ""}
        ${s.precio_diesel != null ? `<span style="font-size:13px;color:#3b82f6;font-weight:600;">Diésel: ${s.precio_diesel.toFixed(3)}€</span>` : ""}
      </td>
    </tr>`
    )
    .join("")

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr>
          <td style="padding-bottom:24px;text-align:center;">
            <h1 style="margin:0;font-size:22px;font-weight:900;color:#0f172a;">
              Ahorro<span style="color:#059669;">Gasolina</span><span style="color:#94a3b8;">.es</span>
            </h1>
          </td>
        </tr>
        <tr>
          <td style="background:#fff;border-radius:16px;border:1px solid #e2e8f0;padding:32px;">
            <h2 style="margin:0 0 8px;font-size:18px;font-weight:800;color:#0f172a;">Resumen semanal de precios</h2>
            <p style="margin:0 0 24px;color:#475569;font-size:14px;">
              Hola ${displayName || "usuario"}, aquí tienes los precios actuales de tus gasolineras favoritas.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${rows}
            </table>
            <div style="margin-top:28px;text-align:center;">
              <a href="${APP_URL}/buscar" style="display:inline-block;background:#059669;color:#fff;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none;">
                Buscar gasolineras
              </a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 0 0;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              Recibes este correo porque tienes activado el resumen semanal en AhorroGasolina.es.
              <br>Puedes desactivarlo desde <a href="${APP_URL}/perfil?tab=notificaciones" style="color:#059669;">tu perfil</a>.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const emailitApiKey = Deno.env.get("EMAILIT_API_KEY")
    if (!emailitApiKey) {
      return new Response(JSON.stringify({ error: "EMAILIT_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    )

    const today = new Date().toISOString().slice(0, 10)
    const isMonday = new Date().getDay() === 1

    const { data: usersWithPrefs } = await supabaseClient
      .from("notification_preferences")
      .select("user_id, price_alerts_enabled, weekly_digest_enabled, price_drop_threshold_pct")
      .or("price_alerts_enabled.eq.true,weekly_digest_enabled.eq.true")

    if (!usersWithPrefs || usersWithPrefs.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    let priceAlertsCount = 0
    let weeklyDigestCount = 0

    for (const pref of usersWithPrefs) {
      const { data: authUser } = await supabaseClient.auth.admin.getUserById(pref.user_id)
      if (!authUser?.user?.email) continue

      const userEmail = authUser.user.email

      const { data: profileData } = await supabaseClient
        .from("profiles")
        .select("display_name")
        .eq("id", pref.user_id)
        .maybeSingle()

      const displayName = profileData?.display_name ?? ""

      const { data: favs } = await supabaseClient
        .from("favourite_stations")
        .select("station_id")
        .eq("user_id", pref.user_id)

      if (!favs || favs.length === 0) continue

      const stationIds = favs.map((f: { station_id: string }) => f.station_id)

      const { data: stations } = await supabaseClient
        .from("estaciones")
        .select("id, rotulo, direccion, localidad, provincia, precio_gasolina_95, precio_gasolina_98, precio_diesel, precio_diesel_premium, precio_glp")
        .in("id", stationIds)

      if (!stations || stations.length === 0) continue

      if (pref.price_alerts_enabled) {
        const { data: snapshots } = await supabaseClient
          .from("station_price_snapshots")
          .select("station_id, precio_gasolina_95, precio_gasolina_98, precio_diesel, precio_diesel_premium, precio_glp")
          .in("station_id", stationIds)
          .lt("snapshot_date", today)
          .order("snapshot_date", { ascending: false })

        const latestSnapshots: Record<string, Snapshot> = {}
        for (const snap of (snapshots ?? []) as Snapshot[]) {
          if (!latestSnapshots[snap.station_id]) {
            latestSnapshots[snap.station_id] = snap
          }
        }

        const drops: { station: Estacion; fuelLabel: string; oldPrice: number; newPrice: number; dropPct: number }[] = []
        const thresholdPct = Number(pref.price_drop_threshold_pct) || 2

        for (const station of stations as Estacion[]) {
          const snap = latestSnapshots[station.id]
          if (!snap) continue

          const fuelKeys: FuelKey[] = ["precio_gasolina_95", "precio_gasolina_98", "precio_diesel", "precio_diesel_premium", "precio_glp"]
          for (const key of fuelKeys) {
            const oldPrice = snap[key]
            const newPrice = station[key]
            if (oldPrice == null || newPrice == null) continue
            const dropPct = ((oldPrice - newPrice) / oldPrice) * 100
            if (dropPct >= thresholdPct) {
              drops.push({ station, fuelLabel: FUEL_LABELS[key], oldPrice, newPrice, dropPct })
            }
          }
        }

        if (drops.length > 0) {
          await sendEmail(
            emailitApiKey,
            userEmail,
            `Bajada de precio en ${drops.length} gasolinera${drops.length > 1 ? "s" : ""} favorita${drops.length > 1 ? "s" : ""}`,
            priceAlertHtml(displayName, drops)
          )
          priceAlertsCount++
        }
      }

      if (pref.weekly_digest_enabled && isMonday) {
        await sendEmail(
          emailitApiKey,
          userEmail,
          "Tu resumen semanal de precios de combustible",
          weeklyDigestHtml(displayName, stations as Estacion[])
        )
        weeklyDigestCount++
      }
    }

    for (const station of await (async () => {
      const allIds = [...new Set(usersWithPrefs.flatMap((_) => [] as string[]))]
      if (allIds.length === 0) return []
      const { data } = await supabaseClient
        .from("estaciones")
        .select("id, precio_gasolina_95, precio_gasolina_98, precio_diesel, precio_diesel_premium, precio_glp")
        .limit(5000)
      return data ?? []
    })()) {
      await supabaseClient
        .from("station_price_snapshots")
        .upsert({
          station_id: String((station as Record<string, unknown>).id),
          snapshot_date: today,
          precio_gasolina_95: (station as Record<string, unknown>).precio_gasolina_95,
          precio_gasolina_98: (station as Record<string, unknown>).precio_gasolina_98,
          precio_diesel: (station as Record<string, unknown>).precio_diesel,
          precio_diesel_premium: (station as Record<string, unknown>).precio_diesel_premium,
          precio_glp: (station as Record<string, unknown>).precio_glp,
        }, { onConflict: "station_id,snapshot_date" })
    }

    return new Response(
      JSON.stringify({ ok: true, price_alerts: priceAlertsCount, weekly_digests: weeklyDigestCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
