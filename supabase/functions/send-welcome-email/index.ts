import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
}

const EMAILIT_API_URL = "https://api.emailit.com/v2/emails"
const FROM_EMAIL = "bienvenida@ahorrogasolina.es"
const APP_URL = "https://ahorrogasolina.es"

function welcomeHtml(displayName: string, email: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr>
          <td style="padding-bottom:24px;text-align:center;">
            <h1 style="margin:0;font-size:24px;font-weight:900;color:#0f172a;">
              Ahorro<span style="color:#059669;">Gasolina</span><span style="color:#94a3b8;">.es</span>
            </h1>
          </td>
        </tr>
        <tr>
          <td style="background:#fff;border-radius:16px;border:1px solid #e2e8f0;padding:40px 32px;">
            <div style="text-align:center;margin-bottom:32px;">
              <div style="width:64px;height:64px;background:#d1fae5;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
                <span style="font-size:28px;">⛽</span>
              </div>
              <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0f172a;">
                Bienvenido${displayName ? `, ${displayName}` : ""}
              </h2>
              <p style="margin:0;color:#475569;font-size:15px;">
                Tu cuenta ha sido creada con éxito.
              </p>
            </div>

            <div style="background:#f8fafc;border-radius:12px;padding:24px;margin-bottom:28px;">
              <p style="margin:0 0 16px;font-weight:700;color:#0f172a;font-size:14px;">Con tu cuenta puedes:</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:6px 0;">
                    <span style="color:#059669;font-weight:700;">✓</span>
                    <span style="color:#334155;font-size:14px;margin-left:8px;">Guardar gasolineras favoritas</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;">
                    <span style="color:#059669;font-weight:700;">✓</span>
                    <span style="color:#334155;font-size:14px;margin-left:8px;">Recibir alertas cuando bajen los precios</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;">
                    <span style="color:#059669;font-weight:700;">✓</span>
                    <span style="color:#334155;font-size:14px;margin-left:8px;">Guardar tus vehículos y estimar el ahorro</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;">
                    <span style="color:#059669;font-weight:700;">✓</span>
                    <span style="color:#334155;font-size:14px;margin-left:8px;">Recibir el resumen semanal de precios</span>
                  </td>
                </tr>
              </table>
            </div>

            <div style="text-align:center;margin-bottom:24px;">
              <a href="${APP_URL}/buscar" style="display:inline-block;background:#059669;color:#fff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;">
                Buscar gasolineras cerca de mí
              </a>
            </div>

            <div style="text-align:center;">
              <a href="${APP_URL}/perfil" style="color:#059669;font-size:13px;text-decoration:none;font-weight:600;">
                Completar mi perfil →
              </a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 0 0;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              Este correo fue enviado a ${email} porque creaste una cuenta en AhorroGasolina.es.
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

    const body = await req.json()
    const { email, display_name } = body

    if (!email) {
      return new Response(JSON.stringify({ error: "email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const response = await fetch(EMAILIT_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${emailitApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: email,
        subject: "Bienvenido a AhorroGasolina.es",
        html: welcomeHtml(display_name ?? "", email),
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return new Response(JSON.stringify({ error: errorText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
