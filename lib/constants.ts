import type { FuelLabel, FuelType } from "./types"

export const DEFAULT_RADIUS = 10

export const RADIUS_OPTIONS = [5, 10, 15, 25, 50]

export const FUEL_LABELS: FuelLabel[] = [
  { key: "gasolina95", label: "Gasolina 95 E5", shortLabel: "G-95" },
  { key: "gasolina98", label: "Gasolina 98 E5", shortLabel: "G-98" },
  { key: "diesel", label: "Diésel A", shortLabel: "Diésel" },
  { key: "dieselPremium", label: "Diésel Premium", shortLabel: "D. Premium" },
  { key: "glp", label: "Gas Licuado (GLP)", shortLabel: "GLP" },
]

export const FUEL_LABEL_MAP: Record<FuelType, string> = {
  gasolina95: "Gasolina 95 E5",
  gasolina98: "Gasolina 98 E5",
  diesel: "Diésel A",
  dieselPremium: "Diésel Premium",
  glp: "Gas Licuado (GLP)",
  electric: "Eléctrico",
}

export const MADRID_CENTER: [number, number] = [40.4168, -3.7038]

export const DEFAULT_ZOOM = 13
