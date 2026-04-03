export interface Estacion {
  id: string
  rotulo: string
  direccion: string
  localidad: string
  provincia: string
  cp: string
  latitud: number
  longitud: number
  horario: string
  precioGasolina95?: number
  precioGasolina98?: number
  precioDiesel?: number
  precioDieselPremium?: number
  precioGLP?: number
  distancia?: number
}

export type FuelType = "gasolina95" | "gasolina98" | "diesel" | "dieselPremium" | "glp" | "electric"

export interface SearchParams {
  q?: string
  lat?: string
  lng?: string
  radio?: string
  tipo?: FuelType
}

export interface Brand {
  slug: string
  name: string
  color: string
  stations?: number
  avgGasolina95?: number
  avgDiesel?: number
}

export interface FuelLabel {
  key: FuelType
  label: string
  shortLabel: string
}

export type ChargerStatus = "operational" | "unavailable" | "unknown" | "planned" | "removed"

export type PlugType = "type2" | "ccs" | "chademo" | "schuko" | "tesla" | "nacs" | "other"

export type CurrentType = "ac" | "dc" | "unknown"

export type SpeedTier = "slow" | "fast" | "rapid" | "ultra_rapid"

export interface ChargerConnector {
  id: string
  charger_id: string
  ocm_connection_id?: number
  plug_type: PlugType
  plug_type_label: string
  current_type: CurrentType
  power_kw?: number
  speed_tier: SpeedTier
  quantity: number
  connector_status: ChargerStatus
}

export interface Charger {
  id: string
  ocm_id: number
  name: string
  operator_name: string
  address: string
  city: string
  province: string
  postcode: string
  lat: number
  lng: number
  status: ChargerStatus
  status_last_updated?: string
  usage_cost_raw?: string
  usage_cost_per_kwh?: number
  usage_cost_per_minute?: number
  is_free: boolean
  access_type: string
  ocm_url?: string
  last_synced_at: string
  connectors?: ChargerConnector[]
  distancia?: number
}

export interface ChargerFilters {
  status: ChargerStatus[]
  plugTypes: PlugType[]
  speedTiers: SpeedTier[]
  pricingType: "all" | "free" | "paid"
}
