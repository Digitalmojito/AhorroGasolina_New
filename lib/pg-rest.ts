import https from "node:https"
import type { IncomingMessage } from "node:http"

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL!
const KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function request(
  method: string,
  urlPath: string,
  extraHeaders: Record<string, string> = {},
  body?: string
): Promise<{ status: number; headers: IncomingMessage["headers"]; body: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE}${urlPath}`)
    const reqHeaders: Record<string, string> = {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...extraHeaders,
    }
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: reqHeaders,
    }
    const req = https.request(options, (res) => {
      let data = ""
      res.on("data", (chunk) => { data += chunk })
      res.on("end", () =>
        resolve({ status: res.statusCode ?? 200, headers: res.headers, body: data })
      )
    })
    req.on("error", reject)
    if (body) req.write(body)
    req.end()
  })
}

export async function pgQuery<T = unknown>(
  table: string,
  qs: string,
  extraHeaders: Record<string, string> = {}
): Promise<T[]> {
  const res = await request("GET", `/rest/v1/${table}?${qs}`, extraHeaders)
  const parsed = JSON.parse(res.body)
  if (!Array.isArray(parsed)) throw new Error(parsed?.message ?? "DB error")
  return parsed as T[]
}

export async function pgCount(table: string, filter = ""): Promise<number> {
  const qs = `select=id${filter ? "&" + filter : ""}&limit=1`
  const res = await request("GET", `/rest/v1/${table}?${qs}`, {
    "Range-Unit": "items",
    Prefer: "count=exact",
    Range: "0-0",
  })
  const cr = res.headers["content-range"] as string | undefined
  if (cr) {
    const m = cr.match(/\/(\d+)$/)
    if (m) return parseInt(m[1], 10)
  }
  return 0
}

export async function pgInsert(
  table: string,
  row: Record<string, unknown>
): Promise<void> {
  await request("POST", `/rest/v1/${table}`, { Prefer: "return=minimal" }, JSON.stringify(row))
}

export async function pgDelete(table: string, filter: string): Promise<void> {
  await request("DELETE", `/rest/v1/${table}?${filter}`)
}

export async function pgAuth(token: string): Promise<{ id: string; email: string } | null> {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE}/auth/v1/user`)
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: "GET",
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    }
    const req = https.request(options, (res) => {
      let data = ""
      res.on("data", (chunk) => { data += chunk })
      res.on("end", () => {
        if (res.statusCode !== 200) return resolve(null)
        try {
          const parsed = JSON.parse(data) as { id?: string; email?: string }
          if (parsed?.id) resolve({ id: parsed.id, email: parsed.email ?? "" })
          else resolve(null)
        } catch {
          resolve(null)
        }
      })
    })
    req.on("error", reject)
    req.end()
  })
}
