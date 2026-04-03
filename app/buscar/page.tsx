import type { Metadata } from "next"
import { SearchResultsLayout } from "@/components/search-results-layout"
import type { FuelType } from "@/lib/types"

export const metadata: Metadata = {
  title: "Buscar Gasolineras - AhorroGasolina.es",
  description: "Encuentra las gasolineras más baratas cerca de ti. Mapa interactivo y lista de precios.",
}

interface PageProps {
  searchParams: {
    lat?: string
    lng?: string
    q?: string
    tipo?: string
    radio?: string
  }
}

export default function BuscarPage({ searchParams }: PageProps) {
  const lat = searchParams.lat ? parseFloat(searchParams.lat) : undefined
  const lng = searchParams.lng ? parseFloat(searchParams.lng) : undefined
  const fuel = (searchParams.tipo as FuelType) || "gasolina95"
  const radius = searchParams.radio ? parseFloat(searchParams.radio) : 10

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 64px)" }}>
      <SearchResultsLayout
        initialLat={lat}
        initialLng={lng}
        initialQ={searchParams.q}
        initialFuel={fuel}
        initialRadius={radius}
      />
    </div>
  )
}
