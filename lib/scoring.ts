import type { Estacion, FuelType } from "@/lib/types"

export type BadgeType = "mejor_precio" | "mas_cercana" | "mejor_opcion" | "abierto_24h"

export interface RankedSets {
  mejorOpcionTop5: string[]
  mejorPrecioTop10: string[]
  masCercanaTop10: string[]
}

export function getPriceForFuel(station: Estacion, fuel: FuelType): number | undefined {
  const map: Record<FuelType, number | undefined> = {
    gasolina95: station.precioGasolina95,
    gasolina98: station.precioGasolina98,
    diesel: station.precioDiesel,
    dieselPremium: station.precioDieselPremium,
    glp: station.precioGLP,
    electric: undefined,
  }
  return map[fuel]
}

function isOpen24h(horario: string): boolean {
  const h = (horario || "").toLowerCase()
  return h.includes("24h") || h.includes("l-d: 24h") || h.includes("permanente")
}

export function computeBadges(
  stations: Estacion[],
  fuelType: FuelType
): Record<string, BadgeType> {
  const result: Record<string, BadgeType> = {}
  if (!stations.length) return result

  const withPrice = stations.filter((s) => getPriceForFuel(s, fuelType) !== undefined)

  let cheapestId: string | null = null
  let lowestPrice = Infinity
  for (const s of withPrice) {
    const p = getPriceForFuel(s, fuelType)!
    if (p < lowestPrice) {
      lowestPrice = p
      cheapestId = s.id
    }
  }

  let nearestId: string | null = null
  let nearestDist = Infinity
  for (const s of stations) {
    const d = s.distancia ?? Infinity
    if (d < nearestDist) {
      nearestDist = d
      nearestId = s.id
    }
  }

  let bestOptionId: string | null = null
  let bestNetSaving = 0

  if (nearestId) {
    const nearest = stations.find((s) => s.id === nearestId)!
    const nearestPrice = nearest ? getPriceForFuel(nearest, fuelType) : undefined

    if (nearestPrice !== undefined) {
      for (const s of withPrice) {
        if (s.id === nearestId) continue
        const p = getPriceForFuel(s, fuelType)!
        const extraKm = (s.distancia ?? 0) - (nearest.distancia ?? 0)
        const priceSaving = (nearestPrice - p) * 50
        const extraCost = Math.max(0, extraKm) * 0.07
        const netSaving = priceSaving - extraCost
        if (netSaving > bestNetSaving) {
          bestNetSaving = netSaving
          bestOptionId = s.id
        }
      }
    }
  }

  for (const s of stations) {
    if (isOpen24h(s.horario)) {
      result[s.id] = "abierto_24h"
    }
  }

  if (nearestId) result[nearestId] = "mas_cercana"
  if (cheapestId) result[cheapestId] = "mejor_precio"
  if (bestOptionId) result[bestOptionId] = "mejor_opcion"

  if (nearestId && cheapestId && nearestId === cheapestId) {
    result[cheapestId] = "mejor_opcion"
  }

  return result
}

export function computeRankedSets(
  stations: Estacion[],
  fuelType: FuelType
): RankedSets {
  if (!stations.length) {
    return { mejorOpcionTop5: [], mejorPrecioTop10: [], masCercanaTop10: [] }
  }

  const withPrice = stations.filter((s) => getPriceForFuel(s, fuelType) !== undefined)

  let nearestId: string | null = null
  let nearestDist = Infinity
  for (const s of stations) {
    const d = s.distancia ?? Infinity
    if (d < nearestDist) {
      nearestDist = d
      nearestId = s.id
    }
  }

  const nearest = nearestId ? stations.find((s) => s.id === nearestId) : undefined
  const nearestPrice = nearest ? getPriceForFuel(nearest, fuelType) : undefined

  const scored: { id: string; netSaving: number }[] = []
  if (nearest && nearestPrice !== undefined) {
    for (const s of withPrice) {
      const p = getPriceForFuel(s, fuelType)!
      const extraKm = (s.distancia ?? 0) - (nearest.distancia ?? 0)
      const priceSaving = (nearestPrice - p) * 50
      const extraCost = Math.max(0, extraKm) * 0.07
      const netSaving = priceSaving - extraCost
      scored.push({ id: s.id, netSaving })
    }
  }

  scored.sort((a, b) => b.netSaving - a.netSaving)
  const mejorOpcionTop5 = scored.slice(0, 5).map((x) => x.id)

  const sortedByPrice = [...withPrice].sort((a, b) => {
    const pa = getPriceForFuel(a, fuelType)!
    const pb = getPriceForFuel(b, fuelType)!
    return pa - pb
  })
  const mejorPrecioTop10 = sortedByPrice.slice(0, 10).map((s) => s.id)

  const sortedByDist = [...stations].sort(
    (a, b) => (a.distancia ?? 999) - (b.distancia ?? 999)
  )
  const masCercanaTop10 = sortedByDist.slice(0, 10).map((s) => s.id)

  return { mejorOpcionTop5, mejorPrecioTop10, masCercanaTop10 }
}

export function getAhorroEstimado(
  station: Estacion,
  allStations: Estacion[],
  fuelType: FuelType
): number | null {
  const stationPrice = getPriceForFuel(station, fuelType)
  if (stationPrice === undefined) return null

  let nearestId: string | null = null
  let nearestDist = Infinity
  for (const s of allStations) {
    if (s.id === station.id) continue
    const d = s.distancia ?? Infinity
    if (d < nearestDist) {
      nearestDist = d
      nearestId = s.id
    }
  }

  if (!nearestId) return null
  const nearest = allStations.find((s) => s.id === nearestId)!
  const nearestPrice = getPriceForFuel(nearest, fuelType)
  if (nearestPrice === undefined) return null

  const saving = (nearestPrice - stationPrice) * 50
  return saving > 0.01 ? saving : null
}
