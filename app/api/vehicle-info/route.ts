import { NextRequest, NextResponse } from "next/server"

const NHTSA_BASE = "https://vpic.nhtsa.dot.gov/api/vehicles"

type NhtsaResult = { Value: string | null; ValueId: string | null }

async function getModelsForMake(make: string): Promise<string[]> {
  const url = `${NHTSA_BASE}/GetModelsForMake/${encodeURIComponent(make)}?format=json`
  const res = await fetch(url, { next: { revalidate: 86400 } })
  if (!res.ok) return []
  const json = await res.json() as { Results: { Model_Name: string }[] }
  return (json.Results ?? []).map((r) => r.Model_Name).sort()
}

async function getVehicleVariables(make: string, model: string): Promise<Record<string, string>> {
  const url = `${NHTSA_BASE}/DecodeVINValuesBatch/`
  const year = new Date().getFullYear() - 1

  const searchUrl = `${NHTSA_BASE}/GetModelsForMakeYear/make/${encodeURIComponent(make)}/modelyear/${year}?format=json`
  const res = await fetch(searchUrl, { next: { revalidate: 86400 } })
  if (!res.ok) return {}

  const json = await res.json() as { Results: { Model_Name: string; ElectricVehicleType: string | null; FuelTypePrimary: string | null }[] }
  const match = (json.Results ?? []).find((r) =>
    r.Model_Name?.toLowerCase() === model.toLowerCase()
  )
  if (!match) return {}

  return {
    electrification: match.ElectricVehicleType ?? "",
    fuel: match.FuelTypePrimary ?? "",
  }
}

function inferPowertrain(make: string, model: string): string | null {
  const key = `${make} ${model}`.toLowerCase()

  const electricModels = [
    "tesla", "model s", "model 3", "model x", "model y", "cybertruck",
    "ioniq 5", "ioniq 6", "ioniq 9", "ev3", "ev6", "ev9",
    "leaf", "ariya", "id.3", "id.4", "id.5", "id.7",
    "atto 3", "dolphin", "seal", "han", "tang", "yuan plus",
    "i4", "i5", "i7", "ix", "ix1", "ix3", "i3",
    "eq", "eqa", "eqb", "eqc", "eqe", "eqs",
    "e-tron", "q4 e-tron", "q6 e-tron",
    "born", "tavascan",
    "mach-e", "mustang mach-e",
    "bz4x",
    "c40 recharge", "ex30", "ex40", "ex90",
    "enyaq", "elroq",
    "r5 e-tech", "zoe",
    "e-208", "e-2008", "e-3008", "e-5008",
    "ë-c3", "ë-c4",
    "spring", "megane",
    "corsa-e", "mokka-e",
    "500e",
    "solterra",
    "ariya",
    "recharge", "ex", "em90",
    "taycan",
    "ioniq",
    "bolt ev",
    "lyriq",
    "rivian",
    "polestar",
    "spectre", "ghost electric",
    "e-ny1",
    "gv60", "ioniq",
    "smart #1", "smart #3",
    "nio", "xpeng", "byd",
    "leapmotor", "zeekr", "li auto",
  ]

  const phevModels = [
    "outlander phev", "eclipse cross phev",
    "niro phev", "sorento phev", "sportage phev",
    "tucson phev", "santa fe phev",
    "qashqai e-power",
    "q5 tfsi e", "q7 tfsi e", "a3 tfsi e",
    "330e", "x5 45e", "x3 30e",
    "c350e", "e350e",
    "golf gte", "passat gte",
    "leon phev", "formentor phev",
    "ateca phev",
    "prius phev", "rav4 phev",
    "cx-60 phev",
    "kuga phev", "explorer phev",
    "tonale phev",
    "range rover phev", "defender phev",
    "cayenne e-hybrid", "panamera e-hybrid",
    "granturismo folgore",
    "wey coffee",
    "c5 aircross", "3008 hybrid",
    "plugin_hybrid",
  ]

  const hybridModels = [
    "prius", "yaris hybrid", "corolla hybrid", "rav4 hybrid", "chr hybrid",
    "jazz hybrid", "civic hybrid",
    "ioniq hybrid",
    "kona hybrid", "tucson hybrid", "santa fe hybrid",
    "niro hybrid",
    "mild hybrid",
    "mhev",
    "kodiaq hybrid",
  ]

  for (const phev of phevModels) {
    if (key.includes(phev)) return "plugin_hybrid"
  }
  for (const ev of electricModels) {
    if (key.includes(ev)) return "electric"
  }
  for (const hyb of hybridModels) {
    if (key.includes(hyb)) return "hybrid"
  }

  const electricMakes = ["tesla", "nio", "xpeng", "byd", "leapmotor", "zeekr", "li auto", "rivian", "polestar", "smart"]
  for (const em of electricMakes) {
    if (make.toLowerCase() === em) return "electric"
  }

  return null
}

function inferFuelType(make: string, model: string, powertrain: string | null): string | null {
  if (powertrain === "electric") return "electric"
  const key = `${make} ${model}`.toLowerCase()
  if (key.includes("diesel") || key.includes("dci") || key.includes("tdi") || key.includes("cdti") || key.includes("hdi") || key.includes("jtd") || key.includes("bluehdi")) return "diesel"
  if (key.includes("glp") || key.includes("lpg") || key.includes("autogas")) return "glp"
  return null
}

function inferBodyType(make: string, model: string): string | null {
  const key = `${make} ${model}`.toLowerCase()
  const suvKeywords = ["suv", "4x4", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "x1", "x2", "x3", "x5", "x6", "x7", "ix1", "ix3", "kuga", "puma", "qashqai", "juke", "ariya", "kona", "tucson", "santa fe", "stonic", "ioniq 5", "ioniq 9", "rav4", "c-hr", "chr", "cx-", "duster", "ateca", "formentor", "tavascan", "terramar", "karoq", "kodiaq", "enyaq", "elroq", "2008", "3008", "5008", "aircross", "grandland", "mokka", "crossland", "frontera", "xt4", "xt5", "xt6", "gv60", "gv70", "gv80", "evoque", "velar", "defender", "discovery", "sport", "wrangler", "compass", "renegade", "avenger", "stelvio", "tonale", "urus", "cayenne", "macan", "gla", "glb", "glc", "gle", "gls", "glk", "ml", "portal", "purosangue", "levante", "grecale"]
  const urbanKeywords = ["polo", "up!", "ibiza", "fabia", "corsa", "208", "108", "clio", "twingo", "aygo", "yaris", "jazz", "micra", "picanto", "i10", "i20", "c1", "c2", "c3", "fiesta", "swift", "ignis", "baleno", "sandero", "logan", "500", "panda", "punto", "bravo", "mii", "smart", "ka", "arosa", "mii", "spark", "seagull"]
  const familyKeywords = ["monovolumen", "touran", "zafira", "c4 grand", "c4 picasso", "espace", "scenic", "berlingo", "kangoo", "lodgy", "combo", "doblo", "dobló", "staria", "lancer", "class b", "classe b", "b-class", "b class", "odyssey", "sienna", "people", "viano", "vito", "caravelle", "sharan", "alhambra"]
  const estateKeywords = ["avant", "touring", "sport tourer", "estate", "kombi", "variant", "sw", "break", "ranchera", "wagon", "octavia", "superb", "a6 avant", "a4 avant", "passat variant", "v60", "v90", "xc40", "xc60", "xc90"]
  const sportsKeywords = ["gti", "gtd", "gte", "gts", "gt", "sport", "cupra", "rs", "m3", "m4", "m5", "911", "cayman", "boxster", "718", "ferrari", "lamborghini", "mclaren", "aston", "bentley", "porsche 718", "supra", "gr yaris", "gr86", "brz", "z4", "tt", "roadster", "stinger", "gr", "type r", "golf r", "focus rs", "fiesta st", "veloster", "celica", "mx-5", "miata", "f-type", "f-pace sport", "amg", "r8", "s3", "s5", "s7"]
  const convertibleKeywords = ["convertible", "cabriolet", "spider", "spyder", "roadster", "soft top", "drop", "124 spider", "z4", "slk", "sl", "f-type convertible", "mx-5", "c3 cabriolet", "207cc", "308cc", "ds3 cabrio"]
  const commercialKeywords = ["transit", "sprinter", "crafter", "vito", "expert", "proace", "jumpy", "connect", "vivaro", "trafic", "master", "movano", "ducato", "daily", "navara", "l200", "amarok", "ranger", "hilux", "promaster", "ram 1500", "ram 2500", "f-150", "silverado", "f150", "pickup", "van", "courier", "kombi", "caddy", "berlingo van", "kangoo van"]

  for (const kw of convertibleKeywords) { if (key.includes(kw)) return "descapotable" }
  for (const kw of sportsKeywords) { if (key.includes(kw)) return "deportivo" }
  for (const kw of commercialKeywords) { if (key.includes(kw)) return "comercial" }
  for (const kw of familyKeywords) { if (key.includes(kw)) return "monovolumen" }
  for (const kw of suvKeywords) { if (key.includes(kw)) return "suv" }
  for (const kw of urbanKeywords) { if (key.includes(kw)) return "urbano" }
  for (const kw of estateKeywords) { if (key.includes(kw)) return "ranchera" }

  return null
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const make = searchParams.get("make") ?? ""
  const model = searchParams.get("model") ?? ""
  const action = searchParams.get("action") ?? "enrich"

  try {
    if (action === "models" && make) {
      const models = await getModelsForMake(make)
      return NextResponse.json({ models }, {
        headers: { "Cache-Control": "public, s-maxage=86400" },
      })
    }

    if (action === "enrich" && make && model) {
      const powertrain = inferPowertrain(make, model)
      const fuelType = inferFuelType(make, model, powertrain)
      const bodyType = inferBodyType(make, model)

      return NextResponse.json({
        powertrain,
        fuel_type: fuelType,
        body_type: bodyType,
      }, {
        headers: { "Cache-Control": "public, s-maxage=86400" },
      })
    }

    return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
  } catch {
    return NextResponse.json({ error: "Error al obtener datos" }, { status: 500 })
  }
}
